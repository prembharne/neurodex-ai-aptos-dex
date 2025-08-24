import { isRiskQueryIntent } from '../intents/schema.js';
export class RiskQueryAdapter {
    canHandle(intent) { return isRiskQueryIntent(intent); }
    async simulate(intent) {
        return { note: `Risk analysis (${intent.focus || 'general'}) – no on-chain transaction`, raw: { focus: intent.focus } };
    }
    async execute(intent) {
        return { hash: '0xNO_TX_RISK_QUERY', simulated: await this.simulate(intent) };
    }
}
