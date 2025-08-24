/*
 * Intent schemas & validation for the prompt-to-action agent.
 *
 * We model on-chain actionable intents (initially for Aptos) such as:
 *  - TRANSFER: move fungible tokens between accounts
 *  - SWAP: swap one fungible token for another via a DEX adapter
 *  - (extensible) FUTURE intents can be added with strong typing
 *
 * Design goals:
 *  - Strong static typings (derive from Zod)
 *  - Narrow, explicit value domains (enums, regex, branded types)
 *  - Helpful, structured validation errors for UI & logging
 *  - Forward compatibility: unknown intents are still representable
 */

import { z } from 'zod';

/**************************************
 * Primitive / branded scalar schemas *
 **************************************/

// Aptos addresses: 0x + 1-64 hex chars (canonical form often 64)
export const aptosAddressRegex = /^0x[a-fA-F0-9]{1,64}$/;
export const AptosAddress = z
  .string()
  .regex(aptosAddressRegex, 'Invalid Aptos address (expected 0x + hex, <= 64 chars)')
  .transform((s) => s.toLowerCase() as `${string}`);

// Token symbol: letters/numbers + at most one dash, 2-15 chars
export const TokenSymbol = z
  .string()
  .min(2)
  .max(15)
  .regex(/^[A-Z0-9]+(-[A-Z0-9]+)?$/i, 'Invalid token symbol');

// Positive decimal amount (string to preserve precision)
export const PositiveAmountString = z
  .string()
  .trim()
  .min(1)
  .regex(/^(?:0|[1-9]\d*)(?:\.\d+)?$/, 'Amount must be a positive decimal number')
  .refine((v) => Number(v) > 0, 'Amount must be greater than zero');

// Confidence 0..1 inclusive
export const Confidence = z
  .number({ invalid_type_error: 'Confidence must be a number' })
  .gte(0)
  .lte(1);

// Slippage (basis points) 1 - 10_000 (<=100%)
export const SlippageBps = z
  .number({ invalid_type_error: 'Slippage must be a number (basis points)' })
  .int()
  .min(1)
  .max(10_000);

// Network identifier (only aptos for now) kept as enum for future multi-chain
export const Network = z.enum(['aptos']);

/***********************
 * Base intent metadata *
 ***********************/

export const IntentType = z.enum(['TRANSFER', 'SWAP', 'RISK_QUERY', 'UNKNOWN']);

export const BaseIntent = z.object({
  type: IntentType,
  // id optional until persisted; can be a ULID/UUID (loose pattern for flexibility)
  id: z
    .string()
    .regex(/^[0-9A-Za-z_-]{8,64}$/u, 'id must be a ULID/UUID-like token')
    .optional(),
  network: Network.default('aptos'),
  sourcePrompt: z.string().min(1, 'sourcePrompt required'),
  confidence: Confidence.optional(),
  // Original natural language slice responsible for this parsed intent
  evidence: z.string().optional(),
  // Arbitrary structured metadata (should be JSON-safe)
  meta: z.record(z.any()).optional(),
  createdAt: z.coerce.date().optional(),
});

/***********************
 * Specific intent types *
 ***********************/

// TRANSFER intent
export const TransferIntent = BaseIntent.extend({
  type: z.literal('TRANSFER'),
  from: AptosAddress.optional(), // optional if using connected wallet
  to: AptosAddress.describe('Recipient address'),
  amount: PositiveAmountString.describe('Token amount as decimal string'),
  token: TokenSymbol.describe('Fungible token symbol'),
}).strict();

// SWAP intent (DEX)
// Exactly one of amountIn or amountOut must be provided.
export const SwapIntent = BaseIntent.extend({
  type: z.literal('SWAP'),
  fromToken: TokenSymbol,
  toToken: TokenSymbol,
  amountIn: PositiveAmountString.optional(),
  amountOut: PositiveAmountString.optional(),
  slippageBps: SlippageBps.default(50).describe('Max slippage in basis points (0.50% default)'),
}).strict();

// UNKNOWN fallback (captures unparsed but maybe partially extracted info)
export const UnknownIntent = BaseIntent.extend({
  type: z.literal('UNKNOWN'),
  raw: z.any().optional(),
  note: z.string().optional(),
}).strict();

// RISK_QUERY informational (non-executable on-chain) — e.g. liquidation, leverage health
export const RiskQueryIntent = BaseIntent.extend({
  type: z.literal('RISK_QUERY'),
  asset: TokenSymbol.optional(),
  leverage: PositiveAmountString.optional(),
  focus: z.string().optional().describe('Specific risk focus e.g. liquidation, health, margin'),
}).strict();

/****************
 * Union schema *
 ****************/

export const Intent = z.discriminatedUnion('type', [TransferIntent, SwapIntent, RiskQueryIntent, UnknownIntent]);
export type Intent = z.infer<typeof Intent>;
export type TransferIntent = z.infer<typeof TransferIntent>;
export type SwapIntent = z.infer<typeof SwapIntent>;
export type UnknownIntent = z.infer<typeof UnknownIntent>;
export type RiskQueryIntent = z.infer<typeof RiskQueryIntent>;

/********************************
 * Helpers / type guards / utils *
 ********************************/

export function parseIntent(data: unknown): Intent {
  const intent = Intent.parse(data);
  return validateIntent(intent);
}

export function safeParseIntent(data: unknown) {
  return Intent.safeParse(data);
}

export function isTransferIntent(i: Intent): i is TransferIntent {
  return i.type === 'TRANSFER';
}

export function isSwapIntent(i: Intent): i is SwapIntent {
  return i.type === 'SWAP';
}

export function isUnknownIntent(i: Intent): i is UnknownIntent {
  return i.type === 'UNKNOWN';
}
export function isRiskQueryIntent(i: Intent): i is RiskQueryIntent { return i.type === 'RISK_QUERY'; }

// Flatten zod error to a concise array of path: message strings (UI friendly)
export function formatZodError(err: z.ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.') || '(root)'}: ${e.message}`);
}

// Normalize a partially constructed raw object into an UnknownIntent (used by parser stage before classification)
export function toUnknownIntent(partial: Omit<Partial<UnknownIntent>, 'type'> & { sourcePrompt: string }): UnknownIntent {
  return UnknownIntent.parse({
    type: 'UNKNOWN',
    sourcePrompt: partial.sourcePrompt,
    raw: partial.raw,
    note: partial.note,
    confidence: partial.confidence,
    meta: partial.meta,
    evidence: partial.evidence,
  });
}

/********************
 * Example utilities *
 ********************/

// Attempt to coerce a loosely-structured object (e.g. intermediate LLM JSON) into a strongly typed intent.
// If classification fails but minimal base fields exist, return an UnknownIntent instead of throwing.
export function classifyLooseIntent(input: any): Intent {
  const result = safeParseIntent(input);
  if (result.success) return validateIntent(result.data);
  // Fallback: create UNKNOWN if we at least have a sourcePrompt
  if (input && typeof input.sourcePrompt === 'string' && input.sourcePrompt.length > 0) {
    return toUnknownIntent({ sourcePrompt: input.sourcePrompt, raw: input, note: 'Could not classify intent' });
  }
  // Re-throw detailed error if we can't fallback
  throw result.error;
}

// Additional semantic validation not expressible directly in discriminated union (e.g., cross-field constraints)
export function validateIntent<T extends Intent>(intent: T): T {
  if (intent.type === 'SWAP') {
    const issues: string[] = [];
    if (!!intent.amountIn === !!intent.amountOut) {
      issues.push('Provide exactly one of amountIn or amountOut');
    }
    if (intent.fromToken.toLowerCase() === intent.toToken.toLowerCase()) {
      issues.push('fromToken and toToken must differ');
    }
    if (issues.length) {
      const err = new z.ZodError([
        ...issues.map((m) => ({ code: z.ZodIssueCode.custom, message: m, path: ['SWAP'] as (string | number)[] })),
      ]);
      throw err;
    }
  }
  return intent;
}

/*************************
 * Future extension notes *
 *************************
 * - Add NFT_TRANSFER intent
 * - Add STAKE / UNSTAKE intents
 * - Add multi-action batch container
 * - Chain/network expansion: include chain-specific constraints
 */
