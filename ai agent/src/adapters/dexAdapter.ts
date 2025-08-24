import { SwapIntent } from '../intents/schema.js';
import { AptosClientWrapper } from '../aptos/aptosClient.js';
import { Account, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { IActionAdapter, SimulationPreview, ExecutionResult, isSwap, toAtomicUnits } from './base.js';

/*
 * Demo DEX adapter (Liquidswap-like, hardcoded pool APT<->USDC)
 * NOTE: This is a placeholder: Real implementation requires pool resource lookups & router logic.
 */

export interface SwapBuildResult {
  payload: InputGenerateTransactionPayloadData;
  note: string;
}

export class DexSwapAdapter implements IActionAdapter<SwapIntent> {
  constructor(private client: AptosClientWrapper, private account?: Account) {}

  canHandle(intent: any): intent is SwapIntent { return isSwap(intent); }

  build(intent: SwapIntent): SwapBuildResult {
    const from = intent.fromToken.toUpperCase();
    const to = intent.toToken.toUpperCase();
    if (!['APT', 'USDC'].includes(from) || !['APT', 'USDC'].includes(to)) {
      throw new Error('Demo supports only APT and USDC');
    }
    if (from === to) throw new Error('fromToken and toToken must differ');

    // Placeholder numbers — in reality you'd query on-chain pool for price & build swap
    const amountIn = intent.amountIn ? Number(intent.amountIn) : undefined;
    const amountOut = intent.amountOut ? Number(intent.amountOut) : undefined;

    const slippage = intent.slippageBps ?? 50;
    const note = `Simulated swap ${amountIn ? amountIn + ' ' + from : '~' + amountOut + ' ' + to} with slippage ${slippage}bps`;

    // Placeholder Move function & args (not real Liquidswap entrypoint)
    const payload: InputGenerateTransactionPayloadData = {
      function: '0x1::demo_dex::swap',
      functionArguments: [from, to, (amountIn ?? 0).toString(), (amountOut ?? 0).toString(), slippage],
    } as any;

    return { payload, note };
  }

  async simulate(intent: SwapIntent): Promise<SimulationPreview> {
    if (!this.account) return { note: 'No account configured – swap dry-run only' };
    const { payload, note } = this.build(intent);
    try {
      const { result } = await this.client.simulate(this.account, payload);
      return { gasEstimate: result[0]?.gas_used?.toString(), raw: result[0], note };
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('module_not_found') || msg.includes('Module not found')) {
        return { note: note + ' (module missing on chain – placeholder mock)', raw: { error: 'module_not_found' } };
      }
      throw e;
    }
  }

  async execute(intent: SwapIntent): Promise<ExecutionResult> {
    if (!this.account) return { hash: '0xDRY_RUN', simulated: await this.simulate(intent) };
    const { payload, note } = this.build(intent);
    try {
      const { txn, result } = await this.client.simulate(this.account, payload);
      const hash = await this.client.submit(this.account, txn);
      return { hash, simulated: { raw: result[0], note } };
    } catch (e: any) {
      const msg = e?.message || String(e);
      if (msg.includes('module_not_found') || msg.includes('Module not found')) {
        return { hash: '0xSWAP_PLACEHOLDER', simulated: { note: note + ' (executed mock – module missing)', raw: { error: 'module_not_found' } } };
      }
      throw e;
    }
  }
}
