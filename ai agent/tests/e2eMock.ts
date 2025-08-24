// End-to-end mock test (no real OpenAI / Aptos submission)
// Uses heuristic mock LLM to extract TRANSFER and SWAP intents.
import { IntentParser } from '../src/intents/normalizer.js';
import { AptosClientWrapper } from '../src/aptos/aptosClient.js';
import { TransferAdapter } from '../src/adapters/transferAdapter.js';
import { DexSwapAdapter } from '../src/adapters/dexAdapter.js';
import { createDefaultRouter } from '../src/adapters/router.js';
import { AgentExecutor } from '../src/adapters/executor.js';
import { Account } from '@aptos-labs/ts-sdk';

async function main() {
  // Mock: provider generic (IntentParser default openai, but no key => generic fallback inside parser already)
  const parser = new IntentParser({ provider: 'generic' });
  const aptos = new AptosClientWrapper();
  const account = Account.generate();
  const transferAdapter = new TransferAdapter(aptos, account);
  const swapAdapter = new DexSwapAdapter(aptos, account);
  const router = createDefaultRouter({ transfer: transferAdapter, swap: swapAdapter });
  const executor = new AgentExecutor(parser, router);

  const prompt = 'Send 1.5 APT to 0xabc123 and swap 10 USDC for APT';
  const plan = await executor.plan(prompt);
  console.log('PLAN:', JSON.stringify(plan, null, 2));
  const exec = await executor.execute(prompt);
  console.log('EXECUTE:', JSON.stringify(exec, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
