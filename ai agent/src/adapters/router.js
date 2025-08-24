export class IntentRouter {
    adapters = [];
    register(name, adapter) {
        this.adapters.push({ name, adapter });
        return this; // chainable
    }
    findAdapter(intent) {
        return this.adapters.find(({ adapter }) => adapter.canHandle(intent));
    }
    async simulateAll(intents) {
        const results = [];
        for (const intent of intents) {
            const found = this.findAdapter(intent);
            if (!found) {
                results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
                continue;
            }
            try {
                const simulation = await found.adapter.simulate(intent);
                results.push({ intent, adapterName: found.name, simulation });
            }
            catch (e) {
                results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
            }
        }
        return results;
    }
    async executeAll(intents) {
        const results = [];
        for (const intent of intents) {
            const found = this.findAdapter(intent);
            if (!found) {
                results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
                continue;
            }
            try {
                const execution = await found.adapter.execute(intent);
                results.push({ intent, adapterName: found.name, execution });
            }
            catch (e) {
                results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
            }
        }
        return results;
    }
    // Build raw transaction payloads (if adapter exposes a build() method returning { payload })
    async buildAll(intents) {
        const results = [];
        for (const intent of intents) {
            const found = this.findAdapter(intent);
            if (!found) {
                results.push({ intent, adapterName: 'NONE', error: 'No adapter found' });
                continue;
            }
            const adapter = found.adapter;
            if (typeof adapter.build !== 'function') {
                results.push({ intent, adapterName: found.name, error: 'Adapter does not support raw build' });
                continue;
            }
            try {
                const built = adapter.build(intent);
                results.push({ intent, adapterName: found.name, payload: built?.payload });
            }
            catch (e) {
                results.push({ intent, adapterName: found.name, error: e?.message || String(e) });
            }
        }
        return results;
    }
}
// Convenience factory
export function createDefaultRouter(adapters) {
    const router = new IntentRouter();
    Object.entries(adapters).forEach(([name, adapter]) => router.register(name, adapter));
    return router;
}
