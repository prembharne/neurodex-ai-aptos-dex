import { isTransfer, toAtomicUnits } from './base.js';
import { normalizeAptosAddress } from '../utils/address.js';
export class TransferAdapter {
    client;
    account;
    constructor(client, account) {
        this.client = client;
        this.account = account;
    }
    canHandle(intent) { return isTransfer(intent); }
    build(intent) {
        if (intent.token.toUpperCase() !== 'APT')
            throw new Error('Only APT transfers supported (demo)');
        const octas = toAtomicUnits(intent.amount, 8);
        const toNorm = normalizeAptosAddress(intent.to);
        const payload = {
            function: '0x1::aptos_account::transfer',
            functionArguments: [toNorm, octas.toString()],
        };
        return { payload };
    }
    async simulate(intent) {
        if (!this.account)
            return { note: 'No account configured – dry-run only' };
        const { payload } = this.build(intent);
        const { result } = await this.client.simulate(this.account, payload);
        const resp = result[0];
        return { gasEstimate: resp?.gas_used?.toString(), raw: resp, note: 'Transfer simulation' };
    }
    async execute(intent) {
        if (!this.account)
            return { hash: '0xDRY_RUN', simulated: await this.simulate(intent) };
        const { payload } = this.build(intent);
        const { txn, result } = await this.client.simulate(this.account, payload); // preview first
        const hash = await this.client.submit(this.account, txn); // placeholder submit may be mock
        return { hash, simulated: { raw: result[0], note: 'Executed transfer' } };
    }
}
