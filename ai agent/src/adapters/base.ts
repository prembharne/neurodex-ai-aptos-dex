import { Intent, TransferIntent, SwapIntent } from '../intents/schema.js';

export type AdapterKind = 'transfer' | 'swap';

export interface SimulationPreview {
  gasEstimate?: string;
  note?: string;
  raw?: any;
}

export interface ExecutionResult {
  hash: string; // transaction hash (mock if not actually submitted)
  simulated?: SimulationPreview;
}

export interface IActionAdapter<I extends Intent> {
  canHandle(intent: Intent): intent is I;
  simulate(intent: I): Promise<SimulationPreview>;
  execute(intent: I): Promise<ExecutionResult>;
}

export function isTransfer(i: Intent): i is TransferIntent { return i.type === 'TRANSFER'; }
export function isSwap(i: Intent): i is SwapIntent { return i.type === 'SWAP'; }

// Lightweight decimal -> atomic units converter (avoids bringing big decimal lib for now)
export function toAtomicUnits(amount: string, decimals: number): bigint {
  if (!/^\d+(?:\.\d+)?$/.test(amount)) throw new Error('Invalid decimal amount');
  const [whole, frac = ''] = amount.split('.');
  if (frac.length > decimals) throw new Error(`Too many decimal places (max ${decimals})`);
  const padded = (frac + '0'.repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * BigInt(10 ** decimals) + BigInt(padded);
}
