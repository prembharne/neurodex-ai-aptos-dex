import { IntentParser } from './src/intents/normalizer.js';

async function main() {
  const parser = new IntentParser({ provider: 'generic' }); // mock provider (no API call)
  const prompt = 'Swap 12 USDC for APT then send 3 APT to 0xF00';
  const result = await parser.parse(prompt);
  console.log('RAW TEXT OUTPUT:', result.rawText);
  console.log('INTENTS:', JSON.stringify(result.intents, null, 2));
  if (result.errors) console.log('ERRORS:', result.errors);
  if (result.clarificationsNeeded) console.log('CLARIFY:', result.clarificationsNeeded);
}

main().catch(e => {
  console.error('Test failed:', e);
  process.exit(1);
});
