import { Intent } from '../intents/schema.js';
import { IntentParser } from '../intents/normalizer.js';
import { IntentRouter } from './router.js';

export interface ExecutionPlanResult {
  rawText: string;
  intents: Intent[];
  parseErrors?: string[];
  clarification?: any;
  simulation?: any;
}

export class AgentExecutor {
  constructor(private parser: IntentParser, public router: IntentRouter) {}

  async plan(prompt: string): Promise<ExecutionPlanResult> {
    const parsed = await this.parser.parse(prompt);
    const simulation = await this.router.simulateAll(parsed.intents);
    return {
      rawText: parsed.rawText,
      intents: parsed.intents,
      parseErrors: parsed.errors,
      clarification: parsed.clarificationsNeeded,
      simulation,
    };
  }

  async execute(prompt: string) {
    const plan = await this.plan(prompt);
    if (plan.parseErrors?.length) return plan;
    const execution = await this.router.executeAll(plan.intents);
    return { ...plan, execution };
  }
}
