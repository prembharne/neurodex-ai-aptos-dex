import { IntentParser } from './src/intents/normalizer.js';

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY not set. Skipping live API test.');
    return;
  }
  const parser = new IntentParser({ provider: 'openai', model: 'gpt-4o-mini' });
  const prompt = 'Send 5 APT to 0x123 and then swap 10 USDC to APT';
  const result = await parser.parse(prompt);
  console.log(JSON.stringify(result, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
