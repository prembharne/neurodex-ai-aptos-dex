/*
 * LLM client wrapper: builds prompts and parses JSON output into intents.
 * Designed to be swappable (OpenAI / Anthropic / Local) via a minimal interface.
 */
import { buildSystemPrompt, buildUserPrompt, suggestClarification } from '../utils/promptTemplates.js';
import { classifyLooseIntent, formatZodError } from '../intents/schema.js';
// Minimal fetch wrapper (browser or node). Caller polyfills fetch if needed.
async function httpJson(url, init) {
    const res = await fetch(url, init);
    const text = await res.text();
    if (process.env.LOG_LLM === '1') {
        // eslint-disable-next-line no-console
        console.log('[LLM][HTTP]', init.method, url, 'status=', res.status, 'len=', text.length);
    }
    if (!res.ok) {
        // Try to parse JSON error else return snippet
        let snippet = text.slice(0, 280);
        try {
            const j = JSON.parse(text);
            snippet = JSON.stringify(j).slice(0, 280);
        }
        catch { }
        throw new Error(`LLM HTTP error ${res.status}: ${snippet}`);
    }
    try {
        return JSON.parse(text);
    }
    catch (e) {
        throw new Error('Failed to parse LLM JSON: ' + (e.message || e));
    }
}
export class LLMClient {
    cfg;
    constructor(cfg) {
        this.cfg = { temperature: 0, ...cfg };
    }
    buildMessages(userMessage) {
        return [
            { role: 'system', content: buildSystemPrompt() },
            { role: 'user', content: buildUserPrompt(userMessage) },
        ];
    }
    async extractIntents(userMessage) {
        const messages = this.buildMessages(userMessage);
        const raw = await this.callModel(messages);
        const cleaned = this.cleanResponse(raw);
        const parsed = this.tryParseJSON(cleaned);
        if (!parsed.success) {
            return {
                intents: [],
                rawText: cleaned,
                errors: [parsed.errorMessage || 'Invalid JSON'],
                clarificationsNeeded: { needsClarification: true, message: 'Model output was not valid JSON.' },
            };
        }
        const intentsField = parsed.json?.intents;
        if (!Array.isArray(intentsField)) {
            return {
                intents: [],
                rawText: cleaned,
                errors: ['Missing intents array'],
                clarificationsNeeded: { needsClarification: true, message: 'Output missing intents array.' },
            };
        }
        const intents = [];
        const allErrors = [];
        for (const obj of intentsField) {
            try {
                intents.push(classifyLooseIntent(obj));
            }
            catch (e) {
                if (e?.errors) {
                    allErrors.push(...formatZodError(e));
                }
                else {
                    allErrors.push(String(e?.message || e));
                }
            }
        }
        const clarification = suggestClarification(allErrors);
        return {
            intents,
            rawText: cleaned,
            errors: allErrors.length ? allErrors : undefined,
            clarificationsNeeded: clarification.needsClarification ? clarification : undefined,
        };
    }
    // Provider-specific call (OpenAI style JSON). This is intentionally simple.
    async callModel(messages) {
        switch (this.cfg.provider) {
            case 'openai':
                return this.callOpenAI(messages);
            case 'anthropic':
                return this.callAnthropic(messages);
            case 'deepseek':
                return this.callDeepSeek(messages);
            default:
                return this.mockEcho(messages);
        }
    }
    async callOpenAI(messages) {
        if (!this.cfg.apiKey)
            throw new Error('Missing OpenAI API key');
        const body = {
            model: this.cfg.model,
            temperature: this.cfg.temperature ?? 0,
            messages: messages.map((m) => ({ role: m.role, content: m.content })),
        };
        const json = await httpJson(this.cfg.endpoint || 'https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.cfg.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        const text = json?.choices?.[0]?.message?.content;
        if (!text)
            throw new Error('No content in OpenAI response');
        return text;
    }
    async callAnthropic(messages) {
        if (!this.cfg.apiKey)
            throw new Error('Missing Anthropic API key');
        const system = messages.find((m) => m.role === 'system')?.content || '';
        const user = messages.filter((m) => m.role === 'user').map((m) => m.content).join('\n');
        const body = {
            model: this.cfg.model,
            max_tokens: 1000,
            temperature: this.cfg.temperature ?? 0,
            system,
            messages: [
                { role: 'user', content: user },
            ],
        };
        const json = await httpJson(this.cfg.endpoint || 'https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': this.cfg.apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify(body),
        });
        const text = json?.content?.[0]?.text;
        if (!text)
            throw new Error('No content in Anthropic response');
        return text;
    }
    async callDeepSeek(messages) {
        if (!this.cfg.apiKey)
            throw new Error('Missing DeepSeek API key');
        // DeepSeek R1 exposes an OpenAI-compatible /chat/completions style endpoint in many setups.
        const body = {
            model: this.cfg.model,
            temperature: this.cfg.temperature ?? 0,
            messages: messages.map(m => ({ role: m.role, content: m.content })),
            stream: false,
        };
        const json = await httpJson(this.cfg.endpoint || 'https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${this.cfg.apiKey}`,
            },
            body: JSON.stringify(body),
        });
        const text = json?.choices?.[0]?.message?.content;
        if (!text)
            throw new Error('No content in DeepSeek response');
        return text;
    }
    // Mock for local dev without hitting an API.
    // Heuristically extracts simple TRANSFER & SWAP intents so the rest of the
    // pipeline (router, adapters) can be exercised without an LLM key.
    async mockEcho(messages) {
        const userFull = messages.find((m) => m.role === 'user')?.content || '';
        // Extract the final actual user input after the 'User Input:' marker (used in our prompt template)
        let actualInput = userFull;
        const marker = 'User Input:';
        const idx = userFull.lastIndexOf(marker);
        if (idx >= 0) {
            const slice = userFull.slice(idx + marker.length);
            const respondIdx = slice.indexOf('Respond with ONLY');
            actualInput = (respondIdx >= 0 ? slice.slice(0, respondIdx) : slice).trim();
        }
        const text = actualInput.toLowerCase();
        const intents = [];
        // Simple TRANSFER pattern: send/transfer/move 1.23 APT to 0xabc... (case-insensitive)
        const transferRegex = /(send|transfer|move)\s+([0-9]+(?:\.[0-9]+)?)\s+([a-z0-9-]{2,15})\s+to\s+(0x[a-f0-9]{1,64})/gi;
        let tMatch;
        while ((tMatch = transferRegex.exec(text)) !== null) {
            const [full, _verb, amt, token, to] = tMatch;
            intents.push({
                type: 'TRANSFER',
                sourcePrompt: actualInput,
                evidence: full,
                amount: amt,
                token: token.toUpperCase(),
                to,
                confidence: 0.75,
                meta: { mock: true },
            });
        }
        // Simple SWAP pattern: swap/convert 10 usdc for apt | swap 5 apt to usdc
        const swapRegex = /(swap|convert)\s+([0-9]+(?:\.[0-9]+)?)\s+([a-z0-9-]{2,15})\s+(?:for|to|into)\s+([a-z0-9-]{2,15})/gi;
        let sMatch;
        while ((sMatch = swapRegex.exec(text)) !== null) {
            const [full, _verb, amt, fromTok, toTok] = sMatch;
            intents.push({
                type: 'SWAP',
                sourcePrompt: actualInput,
                evidence: full,
                fromToken: fromTok.toUpperCase(),
                toToken: toTok.toUpperCase(),
                amountIn: amt,
                slippageBps: 50,
                confidence: 0.7,
                meta: { mock: true },
            });
        }
        // Risk / liquidation / leverage queries (broadened)
        const riskRegex = /(liquidation|liq price|risk|health factor|health|margin call|maintenance margin|maint margin|leverage|lev\b)/;
        if (riskRegex.test(text)) {
            const focus = /(liquidation|liq price)/.test(text)
                ? 'liquidation'
                : /(leverage|lev\b)/.test(text)
                    ? 'leverage'
                    : /(health factor|health|margin call|maintenance margin|maint margin)/.test(text)
                        ? 'account_health'
                        : 'risk';
            intents.push({
                type: 'RISK_QUERY',
                sourcePrompt: actualInput,
                evidence: 'risk_query',
                focus,
                confidence: 0.62,
                meta: { mock: true }
            });
            // Lightweight debug to confirm detection path in dev
            // eslint-disable-next-line no-console
            console.debug('[mockEcho] RISK_QUERY detected focus=%s text="%s"', focus, actualInput);
        }
        if (!intents.length) {
            intents.push({ type: 'UNKNOWN', sourcePrompt: actualInput.slice(0, 160), note: 'Mock provider could not parse', confidence: 0.3 });
        }
        return JSON.stringify({ intents });
    }
    cleanResponse(text) {
        // Strip code fences if the model ignored instructions
        return text.replace(/```(?:json)?/gi, '').trim();
    }
    tryParseJSON(text) {
        try {
            const obj = JSON.parse(text);
            return { success: true, json: obj };
        }
        catch (e) {
            return { success: false, errorMessage: e.message };
        }
    }
    async freeformAnswer(prompt) {
        const messages = [
            {
                role: 'system',
                content: 'You are NeuroDex AI, a helpful blockchain and trading assistant. Respond naturally and conversationally like ChatGPT. Provide clear, accurate information about blockchain, DeFi, trading, cryptocurrencies, and related topics. Be friendly and helpful while maintaining expertise. If asked about specific trading actions, provide educational context but remind users to do their own research.'
            },
            { role: 'user', content: prompt },
        ];
        try {
            if (this.cfg.provider === 'generic') {
                // Lightweight heuristic fallback
                return `I'm currently running in demo mode without an AI provider. You asked: "${prompt}". To get full AI responses, configure a DeepSeek API key in the backend.`;
            }
            return await this.callModel(messages);
        }
        catch (e) {
            return `I'm sorry, I'm having trouble connecting to my AI backend right now. Error: ${e.message || e}`;
        }
    }
}
export function createLLMClient(cfg) {
    return new LLMClient(cfg);
}
