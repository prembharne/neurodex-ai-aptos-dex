import { Intent } from '../intents/schema.js';
import { IActionAdapter, SimulationPreview, ExecutionResult } from './base.js';

export interface RouteResolution<I extends Intent = Intent> {
  intent: I;
  adapterName: string;
  simulation?: SimulationPreview;
  execution?: ExecutionResult;
  error?: string;
}

export class IntentRouter {
  private adapters: { name: string; adapter: IActionAdapter<any> }[] = [];

  register(name: string, adapter: IActionAdapter<any>) {
    this.adapters.push({ name, adapter });
    return this; // chainable
  }

  findAdapter(intent: Intent) {
    return this.adapters.find(({ adapter }) => adapter.canHandle(intent));
  }

  async simulateAll(intents: Intent[]): Promise<RouteResolution[]> {
    const results: RouteResolution[] = [];
    for (const intent of intents) {
      const found = this.findAdapter(intent);
      if (!found) {
        results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
        continue;
      }
      try {
        const simulation = await found.adapter.simulate(intent as any);
        results.push({ intent, adapterName: found.name, simulation });
      } catch (e: any) {
        results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
      }
    }
    return results;
  }

  async executeAll(intents: Intent[]): Promise<RouteResolution[]> {
    const results: RouteResolution[] = [];
    for (const intent of intents) {
      const found = this.findAdapter(intent);
      if (!found) {
        results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
        continue;
      }
      try {
        const execution = await found.adapter.execute(intent as any);
        results.push({ intent, adapterName: found.name, execution });
      } catch (e: any) {
        results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
      }
    }
    return results;
  }

  // Build raw transaction payloads (if adapter exposes a build() method returning { payload })
  async buildAll(intents: Intent[]): Promise<(RouteResolution & { payload?: any })[]> {
    const results: (RouteResolution & { payload?: any })[] = [];
    for (const intent of intents) {
      const found = this.findAdapter(intent);
      if (!found) {
        results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
        continue;
      }
      const adapter: any = found.adapter as any;
      if (typeof adapter.build !== 'function') {
        results.push({ intent, adapterName: found.name, error: 'Adapter does not support raw build' });
        continue;
      }
      try {
        const built = adapter.build(intent as any);
        results.push({ intent, adapterName: found.name, payload: built?.payload });
      } catch (e: any) {
        results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
      }
    }
    return results;
  }
}

// Convenience factory
export function createDefaultRouter(adapters: Record<string, IActionAdapter<any>>): IntentRouter {
  const router = new IntentRouter();
  Object.entries(adapters).forEach(([name, adapter]) => router.register(name, adapter));
  return router;
}
