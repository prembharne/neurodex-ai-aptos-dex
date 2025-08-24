import { TransferIntent } from '../intents/schema.js';
import { AptosClientWrapper } from '../aptos/aptosClient.js';
import { Account, InputGenerateTransactionPayloadData } from '@aptos-labs/ts-sdk';
import { IActionAdapter, SimulationPreview, ExecutionResult, isTransfer, toAtomicUnits } from './base.js';
import { normalizeAptosAddress } from '../utils/address.js';

export interface TransferBuildResult {
  payload: InputGenerateTransactionPayloadData;
}

export class TransferAdapter implements IActionAdapter<TransferIntent> {
  constructor(private client: AptosClientWrapper, private account?: Account) {}

  canHandle(intent: any): intent is TransferIntent { return isTransfer(intent); }

  build(intent: TransferIntent): TransferBuildResult {
    if (intent.token.toUpperCase() !== 'APT') throw new Error('Only APT transfers supported (demo)');
    const octas = toAtomicUnits(intent.amount, 8);
    const toNorm = normalizeAptosAddress(intent.to);
    const payload: InputGenerateTransactionPayloadData = {
      function: '0x1::aptos_account::transfer',
      functionArguments: [toNorm, octas.toString()],
    } as any;
    return { payload };
  }

  async simulate(intent: TransferIntent): Promise<SimulationPreview> {
    if (!this.account) return { note: 'No account configured – dry-run only' };
    const { payload } = this.build(intent);
    const { result } = await this.client.simulate(this.account, payload);
    const resp = result[0];
    return { gasEstimate: resp?.gas_used?.toString(), raw: resp, note: 'Transfer simulation' };
  }

  async execute(intent: TransferIntent): Promise<ExecutionResult> {
    if (!this.account) return { hash: '0xDRY_RUN', simulated: await this.simulate(intent) };
    const { payload } = this.build(intent);
    const { txn, result } = await this.client.simulate(this.account, payload); // preview first
    const hash = await this.client.submit(this.account, txn); // placeholder submit may be mock
    return { hash, simulated: { raw: result[0], note: 'Executed transfer' } };
  }
}

