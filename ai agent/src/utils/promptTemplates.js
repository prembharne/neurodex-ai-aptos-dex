/*
 * Prompt template utilities for intent extraction.
 * The goal: deterministically instruct the LLM to output ONLY JSON matching our schema.
 */
import { IntentType } from '../intents/schema.js';
// Textual schema description (kept simple & explicit for the model)
export const INTENT_JSON_SCHEMA_TEXT = `Array of intent objects. Each intent MUST include base fields: 
  type: one of ${IntentType.options.join(', ')}
  sourcePrompt: original user message slice the intent came from (string)
  (Optional) confidence: number 0..1

Depending on type:
  TRANSFER intent fields:
    type: "TRANSFER"
    to: Aptos address (0x... up to 64 hex chars)
    token: token symbol (e.g. APT, USDC)
    amount: decimal string > 0
    (Optional) from: Aptos address (omit if user implies current wallet)

  SWAP intent fields:
    type: "SWAP"
    fromToken: symbol
    toToken: symbol (different from fromToken)
    Exactly one of amountIn OR amountOut: decimal string > 0
    (Optional) slippageBps: integer 1..10000

  UNKNOWN intent fields:
    type: "UNKNOWN"
    note: short reason why classification failed (string)
    raw: optional free-form object with extracted partial data

Return format: A JSON object with a single top-level key "intents" whose value is the array of intent objects.
No markdown. No prose. No extra keys.`;
// Few-shot examples
const FEW_SHOT_EXAMPLES = [
    {
        user: 'Send 5 APT to 0xABC123',
        json: {
            intents: [
                {
                    type: 'TRANSFER',
                    sourcePrompt: 'Send 5 APT to 0xABC123',
                    to: '0xabc123',
                    token: 'APT',
                    amount: '5',
                },
            ],
        },
    },
    {
        user: 'Swap 12.5 USDC for APT then send 2 APT to my friend 0xF00',
        json: {
            intents: [
                {
                    type: 'SWAP',
                    sourcePrompt: 'Swap 12.5 USDC for APT',
                    fromToken: 'USDC',
                    toToken: 'APT',
                    amountIn: '12.5',
                    slippageBps: 50,
                },
                {
                    type: 'TRANSFER',
                    sourcePrompt: 'send 2 APT to my friend 0xF00',
                    to: '0xf00',
                    token: 'APT',
                    amount: '2',
                },
            ],
        },
    },
    {
        user: 'Move everything somewhere safe',
        json: {
            intents: [
                {
                    type: 'UNKNOWN',
                    sourcePrompt: 'Move everything somewhere safe',
                    note: 'Ambiguous: need token, amount, and destination address',
                },
            ],
        },
    },
];
export function buildSystemPrompt() {
    return [
        'You are an intent extraction engine.',
        'Return EXACT JSON only.',
        'If user input lacks required fields, emit an UNKNOWN intent with a helpful note.',
        'If multiple actions are present, output multiple intents preserving original order.',
        'Never include markdown fences.',
        'Never include commentary.',
        'Always lowercase addresses.',
    ].join(' ');
}
export function buildUserPrompt(userMessage) {
    const examples = FEW_SHOT_EXAMPLES.map((ex, i) => `Example ${i + 1} User: ${ex.user}\nExample ${i + 1} JSON: ${JSON.stringify(ex.json)}`).join('\n');
    return [
        'Return EXACT JSON matching this schema:',
        INTENT_JSON_SCHEMA_TEXT,
        examples,
        'User Input:',
        userMessage,
        'Respond with ONLY the JSON object.',
    ].join('\n\n');
}
export function suggestClarification(errors) {
    if (!errors.length)
        return { needsClarification: false };
    // Naive heuristic: map error paths to missingFields list
    const missing = errors.map((e) => e.split(':')[0]);
    return {
        needsClarification: true,
        message: 'Some required intent fields are missing or invalid. Please clarify the highlighted items.',
        missingFields: missing,
    };
}
