/* Aptos client wrapper: simulate, sign, submit */
import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from '@aptos-labs/ts-sdk';
export class AptosClientWrapper {
    aptos;
    constructor(opts = {}) {
        const config = new AptosConfig({ network: opts.network || Network.TESTNET, fullnode: opts.nodeUrl });
        this.aptos = new Aptos(config);
    }
    async simulate(account, payload) {
        const txn = await this.aptos.transaction.build.simple({ sender: account.accountAddress, data: payload });
        const result = await this.aptos.transaction.simulate.simple({
            signerPublicKey: account.publicKey,
            transaction: txn,
        });
        return { txn, result };
    }
    async submit(account, txn) {
        const pending = await this.aptos.signAndSubmitTransaction({ signer: account, transaction: txn });
        // Optionally wait (can be toggled later)
        try {
            await this.aptos.waitForTransaction({ transactionHash: pending.hash });
        }
        catch (_) { }
        return pending.hash;
    }
    async build(payload, sender) {
        return this.aptos.transaction.build.simple({ sender: sender.accountAddress, data: payload });
    }
}
export function createAccountFromPrivateKeyHex(hex) {
    const pk = new Ed25519PrivateKey(hex.startsWith('0x') ? hex : `0x${hex}`);
    return Account.fromPrivateKey({ privateKey: pk });
}
