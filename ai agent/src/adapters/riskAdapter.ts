import { IActionAdapter, SimulationPreview, ExecutionResult } from './base.js';
import { Intent } from '../intents/schema.js';
import { isRiskQueryIntent, RiskQueryIntent } from '../intents/schema.js';

export class RiskQueryAdapter implements IActionAdapter<RiskQueryIntent> {
  canHandle(intent: Intent): intent is RiskQueryIntent { return isRiskQueryIntent(intent); }
  async simulate(intent: RiskQueryIntent): Promise<SimulationPreview> {
    return { note: `Risk analysis (${intent.focus || 'general'}) – no on-chain transaction`, raw: { focus: intent.focus } };
  }
  async execute(intent: RiskQueryIntent): Promise<ExecutionResult> {
    return { hash: '0xNO_TX_RISK_QUERY', simulated: await this.simulate(intent) };
  }
}
