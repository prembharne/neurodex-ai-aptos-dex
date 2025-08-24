export class AgentExecutor {
    parser;
    router;
    constructor(parser, router) {
        this.parser = parser;
        this.router = router;
    }
    async plan(prompt) {
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
    async execute(prompt) {
        const plan = await this.plan(prompt);
        if (plan.parseErrors?.length)
            return plan;
        const execution = await this.router.executeAll(plan.intents);
        return { ...plan, execution };
    }
}
