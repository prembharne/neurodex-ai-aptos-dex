/*
 * Intent Parser (AI Layer)
 * ---------------------------------
 * Responsibility: Take a raw user natural language prompt, call the LLM client, and
 * return validated intents + any clarification needs.
 *
 * This module isolates orchestration logic from UI and low-level LLM wiring.
 *
 * API KEY HANDLING
 * ---------------------------------
 * NEVER hardcode API keys in frontend bundles. Prefer:
 *  1. Server-side: Set process.env.OPENAI_API_KEY (or ANTHROPIC_API_KEY) in your server environment (.env file, secret manager).
 *  2. Provide a thin server route (e.g. /api/parse) that invokes this parser and returns only the structured JSON.
 *  3. For quick local demos ONLY, you may temporarily supply the key when constructing the LLMClient in the browser,
 *     but remove it before deploying.
 *
 * See example server usage at bottom of file.
 */

import { createLLMClient, LLMClient, LLMClientConfig, ExtractIntentsResult } from '../api/llmClient.js';

export interface IntentParserConfig {
  llm?: LLMClient; // preconfigured client (optional)
  provider?: LLMClientConfig['provider'];
  model?: string;
  temperature?: number;
  // For server-side creation: pass explicit API key or rely on process.env
  apiKey?: string;
}

export class IntentParser {
  private llm: LLMClient;

  constructor(cfg: IntentParserConfig = {}) {
    // If caller passed a ready LLM client, use it. Otherwise build one.
    if (cfg.llm) {
      this.llm = cfg.llm;
    } else {
      // Auto-select provider priority: groq first, then deepseek, then explicit, else openai, else generic
      const provider = cfg.provider || (
        process.env.GROQ_API_KEY ? 'groq' :
        process.env.DEEPSEEK_API_KEY ? 'deepseek' :
        'openai'
      );
      // Improved default model selection per provider
      const model = cfg.model || (
        provider === 'anthropic' ? 'claude-3-sonnet-20240229' :
        provider === 'groq' ? (process.env.GROQ_MODEL || 'llama-3.1-70b-versatile') :
        provider === 'deepseek' ? (process.env.DEEPSEEK_MODEL || 'deepseek-chat') :
        'gpt-4o-mini'
      );
      const apiKey = cfg.apiKey || (
        provider === 'openai' ? process.env.OPENAI_API_KEY :
        provider === 'anthropic' ? process.env.ANTHROPIC_API_KEY :
        provider === 'groq' ? process.env.GROQ_API_KEY :
        provider === 'deepseek' ? process.env.DEEPSEEK_API_KEY : undefined
      );
      if (!apiKey) {
        // We don't throw immediately; consumer can still attempt mock provider or handle error gracefully.
        if (provider !== 'generic') {
          console.warn(`[IntentParser] Missing API key for provider ${provider}. Set environment variable GROQ_API_KEY, DEEPSEEK_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.`);
        }
      }
      this.llm = createLLMClient({ provider, model, apiKey, temperature: cfg.temperature ?? 0 });
    }
  }

  /**
   * Parse a user prompt into intents via the configured LLM.
   * @param userPrompt Raw natural language input
   */
  async parse(userPrompt: string): Promise<ExtractIntentsResult> {
    if (!userPrompt || !userPrompt.trim()) {
      return {
        intents: [],
        rawText: '',
        errors: ['Empty prompt'],
        clarificationsNeeded: { needsClarification: true, message: 'Please provide a non-empty prompt.' },
      };
    }
    return this.llm.extractIntents(userPrompt.trim());
  }

  async answer(userPrompt: string): Promise<string> {
    if (!userPrompt || !userPrompt.trim()) return 'Please provide a non-empty prompt.';
    return this.llm.freeformAnswer(userPrompt.trim());
  }
}

// Convenience singleton (OPTIONAL). Not used automatically—UI can import and create its own instance.
let defaultParser: IntentParser | null = null;
export function getDefaultIntentParser(): IntentParser {
  if (!defaultParser) defaultParser = new IntentParser();
  return defaultParser;
}

/*
 * Example server integration (Express) — NOT executed here, reference only:
 *
 * import express from 'express';
 * import { IntentParser } from '../src/intents/normalizer';
 * const app = express();
 * app.use(express.json());
 * const parser = new IntentParser({ provider: 'openai', model: 'gpt-4o-mini' });
 * app.post('/api/parse', async (req, res) => {
 *   try {
 *     const prompt = req.body.prompt || '';
 *     const result = await parser.parse(prompt);
 *     res.json(result);
 *   } catch (e:any) {
 *     res.status(500).json({ error: e.message });
 *   }
 * });
 * // API key placement: put OPENAI_API_KEY in process.env (dotenv, hosting provider secret, etc.)
 */
