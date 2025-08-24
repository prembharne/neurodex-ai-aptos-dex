import 'dotenv/config';
import express from 'express';
import { IntentParser } from '../src/intents/normalizer.js';
import cors from 'cors';
import { Account } from '@aptos-labs/ts-sdk';
import { TransferAdapter } from '../src/adapters/transferAdapter.js';
import { DexSwapAdapter } from '../src/adapters/dexAdapter.js';
import { createDefaultRouter } from '../src/adapters/router.js';
import { AgentExecutor } from '../src/adapters/executor.js';
import { RiskQueryAdapter } from '../src/adapters/riskAdapter.js';
import type { ExecutionPlanResult } from '../src/adapters/executor.js';
import { createAccountFromPrivateKeyHex, AptosClientWrapper } from '../src/aptos/aptosClient.js';

// Perp config (env)
const PERP_MODULE_ADDR = process.env.PERP_MODULE_ADDR || '';
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY || '';

let adminAccount = null;
if (ADMIN_PRIVATE_KEY && ADMIN_PRIVATE_KEY !== 'REPLACE_WITH_ADMIN_PRIVATE_KEY_HEX' && ADMIN_PRIVATE_KEY.match(/^0x[0-9a-fA-F]+$/)) {
  try {
    adminAccount = createAccountFromPrivateKeyHex(ADMIN_PRIVATE_KEY);
  } catch (e) {
    console.warn('[Server] Invalid ADMIN_PRIVATE_KEY format, using null account (Move endpoints disabled)');
  }
}

const aptosClientSingleton = new AptosClientWrapper();

const app = express();
app.use(cors({ origin: true }));
app.use(express.json());

// Dynamic parser (re-created if API key presence changes)
let hasGroqKey = !!process.env.GROQ_API_KEY;
let hasDeepSeekKey = !!process.env.DEEPSEEK_API_KEY;
let hasOpenAIKey = !!process.env.OPENAI_API_KEY;
let parser: IntentParser = new IntentParser({ provider: hasGroqKey ? 'groq' : (hasDeepSeekKey ? 'deepseek' : (hasOpenAIKey ? 'openai' : 'generic')) });
// Adapters & executor (hot-recreated if parser provider changes)
let executor: AgentExecutor = buildExecutor();

function buildExecutor() {
  const aptos = new AptosClientWrapper();
  // Demo ephemeral account (in prod, derive from wallet session or custody)
  const account = Account.generate();
  const transfer = new TransferAdapter(aptos, account);
  const swap = new DexSwapAdapter(aptos, account);
  const risk = new RiskQueryAdapter();
  const router = createDefaultRouter({ transfer, swap, risk });
  return new AgentExecutor(parser, router);
}

function computeHasGroqKey() {
  return !!(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim());
}

function computeHasDeepSeekKey() {
  return !!(process.env.DEEPSEEK_API_KEY && process.env.DEEPSEEK_API_KEY.trim());
}

function computeHasOpenAIKey() {
  return !!(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

function ensureParser() {
  const newGroq = computeHasGroqKey();
  const newDeepSeek = computeHasDeepSeekKey();
  const newOpenAI = computeHasOpenAIKey();
  
  if (newGroq !== hasGroqKey || newDeepSeek !== hasDeepSeekKey || newOpenAI !== hasOpenAIKey) {
    hasGroqKey = newGroq;
    hasDeepSeekKey = newDeepSeek;
    hasOpenAIKey = newOpenAI;
    parser = new IntentParser({ provider: hasGroqKey ? 'groq' : (hasDeepSeekKey ? 'deepseek' : (hasOpenAIKey ? 'openai' : 'generic')) });
    executor = buildExecutor();
    const providerName = hasGroqKey ? 'groq' : (hasDeepSeekKey ? 'deepseek' : (hasOpenAIKey ? 'openai' : 'generic'));
    console.log(`[IntentParser] Reinitialized. provider=${providerName} hasGroq=${hasGroqKey} hasDeepSeek=${hasDeepSeekKey} hasOpenAI=${hasOpenAIKey}`);
  }
  return parser;
}

app.post('/api/parse', async (req, res) => {
  try {
    const prompt = req.body?.prompt || '';
    const result = await ensureParser().parse(prompt);
    res.json(result);
  } catch (e: any) {
    console.error('Parse error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.post('/api/plan', async (req, res) => {
  try {
    ensureParser();
    const prompt = req.body?.prompt || '';
    const plan = await executor.plan(prompt);
    res.json(plan);
  } catch (e: any) {
    console.error('Plan error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.post('/api/execute', async (req, res) => {
  try {
    ensureParser();
    const prompt = req.body?.prompt || '';
    const exec = await executor.execute(prompt);
    res.json(exec);
  } catch (e: any) {
    console.error('Execute error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

app.post('/api/build', async (req, res) => {
  try {
    ensureParser();
    const prompt = req.body?.prompt || '';
    const plan = await executor.plan(prompt);
    // Attach built payloads for signing on client side
    // We reuse router beneath executor (reconstruct build route manually)
    const built = await (executor as any).router.buildAll(plan.intents);
    res.json({ ...plan, built });
  } catch (e: any) {
    console.error('Build error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

function planToNarrative(plan: ExecutionPlanResult, includeExecution = false, execution?: any, originalPrompt: string = '') {
  const lines: string[] = [];
  if (plan.intents.length === 0) {
    lines.push('I did not detect any actionable intents in your request.');
  } else {
    lines.push(`Detected ${plan.intents.length} intent(s):`);
    plan.intents.forEach((i, idx) => {
      if (i.type === 'TRANSFER') {
        lines.push(`${idx + 1}. Transfer ${i.amount} ${i.token} to ${i.to}`);
      } else if (i.type === 'SWAP') {
        lines.push(`${idx + 1}. Swap ${i.amountIn || i.amountOut || '?'} ${i.fromToken} -> ${i.toToken}`);
      } else {
        lines.push(`${idx + 1}. ${i.type}`);
      }
    });
  }
  if (plan.parseErrors?.length) {
    lines.push('Parse issues:');
    plan.parseErrors.forEach(e => lines.push(' - ' + e));
  }
  if (plan.simulation?.length) {
    const sims = plan.simulation;
    lines.push('Simulation summary:');
  sims.forEach((s: any, idx: number) => {
      if (s.error) {
        lines.push(` - Intent #${idx + 1} (${s.adapterName}) error: ${s.error}`);
      } else if (s.simulation) {
        lines.push(` - Intent #${idx + 1} handled by ${s.adapterName}${s.simulation.gasEstimate ? ` gas≈${s.simulation.gasEstimate}` : ''}${s.simulation.note ? ' – ' + s.simulation.note : ''}`);
      }
    });
  }
  if (includeExecution && execution?.length) {
    lines.push('Execution results:');
    execution.forEach((r: any, idx: number) => {
      if (r.error) lines.push(` - #${idx + 1} FAILED (${r.adapterName}): ${r.error}`); else lines.push(` - #${idx + 1} ${r.adapterName} txHash=${r.execution?.hash}`);
    });
  }
  if (plan.clarification?.needsClarification) {
    lines.push('Clarification needed: ' + plan.clarification.message);
  }
  // Domain-specific informational augmentation (mock) for liquidation queries when no actionable trade intent
  const lower = originalPrompt.toLowerCase();
  const hasActionable = plan.intents.some(i => i.type === 'TRANSFER' || i.type === 'SWAP');
  if (!hasActionable && /(liquidation|liq price|liquidate)/i.test(lower)) {
    lines.push('\nLiquidation Insight (mock):');
    lines.push('- This preview build does not yet query on-chain positions, so I can only give general guidance.');
    lines.push('- Perpetual positions liquidate when maintenance margin ratio falls below threshold (e.g. ~6-8%).');
    lines.push('- Higher leverage narrows buffer: LiqPrice ≈ Entry ± (Entry * (InitialMargin - MaintMargin) / (Leverage)).');
    lines.push('- Add collateral or reduce size to move farther from liquidation.');
    lines.push('- I can simulate specific scenarios once position/state integration is added.');
  }
  return lines.join('\n');
}

// Simple conversational chat endpoint (ChatGPT-style)
app.post('/api/chat', async (req, res) => {
  try {
    ensureParser();
    const messages = req.body?.messages || [];
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    const prompt = lastUser?.content || '';
    
    // Direct AI response without intent parsing overhead
    const answer = await parser.answer(prompt);
    res.json({ reply: answer });
  } catch (e: any) {
    console.error('Chat error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Non-streaming chat endpoint (summary style)
app.post('/api/ai/chat', async (req, res) => {
  try {
    ensureParser();
    const messages = req.body?.messages || [];
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    const mode = (req.body?.mode || 'plan') as 'plan' | 'execute';
    const prompt = lastUser?.content || '';
    const plan = await executor.plan(prompt);
    let reply = planToNarrative(plan, false, undefined, prompt);
    let execResult: any = null;
    if (mode === 'execute' && !(plan.parseErrors?.length)) {
      const exec = await executor.execute(prompt); // includes execution
      reply = planToNarrative(exec as any, true, (exec as any).execution, prompt);
      execResult = (exec as any).execution;
    }
  // Always include a contextual blockchain / trading answer (independent of actionable intents)
  const extra = await parser.answer(prompt);
  reply += '\n\nAnswer:\n' + extra;
    res.json({ reply, plan, execution: execResult });
  } catch (e: any) {
    console.error('AI chat error', e);
    res.status(500).json({ error: e.message || 'Internal error' });
  }
});

// Streaming SSE endpoint
app.post('/api/ai/stream', async (req, res) => {
  try {
    ensureParser();
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    const messages = req.body?.messages || [];
    const lastUser = [...messages].reverse().find((m: any) => m.role === 'user');
    const mode = (req.body?.mode || 'plan') as 'plan' | 'execute';
    const prompt = lastUser?.content || '';
    const send = (obj: any) => res.write(`data: ${JSON.stringify(obj)}\n\n`);
    send({ delta: 'Parsing prompt...\n' });
    const plan = await executor.plan(prompt);
    send({ delta: 'Parsed. ' + plan.intents.length + ' intent(s) detected.\n' });
    const narrative = planToNarrative(plan, false, undefined, prompt);
    for (const line of narrative.split('\n')) {
      send({ delta: line + '\n' });
    }
    if (mode === 'execute' && !(plan.parseErrors?.length)) {
      send({ delta: '\nExecuting...\n' });
      const exec = await executor.execute(prompt);
      for (const line of planToNarrative(exec as any, true, (exec as any).execution, prompt).split('\n')) {
        send({ delta: line + '\n' });
      }
    } else if (mode === 'execute') {
      send({ delta: '\nSkipping execution due to parse errors.\n' });
    }
  send({ delta: '\nAnswering...\n' });
  const extra = await parser.answer(prompt);
  for (const line of extra.split('\n')) send({ delta: line + '\n' });
    send({ done: true });
    res.end();
  } catch (e: any) {
    try {
      res.write(`data: ${JSON.stringify({ error: e.message || 'error' })}\n\n`);
      res.write('data: {"done":true}\n\n');
    } catch (_) {}
    res.end();
  }
});

app.get('/health', (_req, res) => {
  ensureParser();
  const provider = hasGroqKey ? 'groq' : (hasDeepSeekKey ? 'deepseek' : (hasOpenAIKey ? 'openai' : 'generic'));
  const hasKey = hasGroqKey || hasDeepSeekKey || hasOpenAIKey;
  res.json({ ok: true, provider, hasKey });
});

// Detailed AI diagnostics (never expose full keys)
app.get('/debug/ai', (_req, res) => {
  ensureParser();
  const provider = hasGroqKey ? 'groq' : (hasDeepSeekKey ? 'deepseek' : (hasOpenAIKey ? 'openai' : 'generic'));
  res.json({
    provider,
    groqKeyPresent: hasGroqKey,
    groqKeyLen: process.env.GROQ_API_KEY ? process.env.GROQ_API_KEY.length : 0,
    groqModel: process.env.GROQ_MODEL || 'llama-3.1-70b-versatile',
    deepseekKeyPresent: hasDeepSeekKey,
    deepseekKeyLen: process.env.DEEPSEEK_API_KEY ? process.env.DEEPSEEK_API_KEY.length : 0,
    deepseekModel: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    openaiKeyPresent: hasOpenAIKey,
    openaiKeyLen: process.env.OPENAI_API_KEY ? process.env.OPENAI_API_KEY.length : 0,
    genericMode: !hasGroqKey && !hasDeepSeekKey && !hasOpenAIKey,
  });
});

// Generic Aptos view proxy (read-only). Body: { function, functionArguments: [] }
app.post('/api/aptos/view', async (req, res) => {
  try {
    const { function: fn, functionArguments } = req.body || {};
    if (!fn) return res.status(400).json({ error: 'function required' });
    const out = await aptosClientSingleton.aptos.view({ payload: { function: fn, functionArguments: functionArguments || [] } as any });
    res.json(out);
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

app.get('/debug/env', (_req, res) => {
  ensureParser();
  const dkey = process.env.DEEPSEEK_API_KEY || '';
  res.json({
    DEEPSEEK_API_KEY_PRESENT: !!dkey,
    DEEPSEEK_API_KEY_LENGTH: dkey.length,
    DEEPSEEK_API_KEY_HEAD: dkey ? dkey.slice(0, 6) + '...' : null,
    NODE_ENV: process.env.NODE_ENV,
  });
});

const basePort = Number(process.env.PORT) || 3000;
function start(port: number, attempt = 0) {
  const server = app.listen(port, () => {
    console.log(`Intent parser server running on http://localhost:${port}`);
    if (!hasDeepSeekKey && !hasOpenAIKey) {
      console.warn('WARNING: No AI provider keys set. Using generic mock provider (no real LLM calls).');
      console.warn('Set DEEPSEEK_API_KEY or OPENAI_API_KEY then restart:');
      console.warn('  $env:DEEPSEEK_API_KEY="sk-..." ; npm run dev');
      console.warn('  or $env:OPENAI_API_KEY="sk-..." ; npm run dev');
    } else {
      const provider = hasDeepSeekKey ? 'DeepSeek' : 'OpenAI';
      console.log(`✅ Using ${provider} AI provider`);
    }
  });
  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE' && attempt < 5) {
      const nextPort = port + 1;
      console.warn(`Port ${port} in use, retrying on ${nextPort}...`);
      start(nextPort, attempt + 1);
    } else {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  });
}
start(basePort);

// -------- Perpetual Module REST (beta) ---------
if (!PERP_MODULE_ADDR) {
  console.warn('[perp] PERP_MODULE_ADDR not set – read/write endpoints disabled');
}

// GET mark price
app.get('/api/perp/mark', async (req, res) => {
  try {
    if (!PERP_MODULE_ADDR) return res.status(400).json({ error: 'PERP_MODULE_ADDR not configured' });
    // view function path: <addr>::perp_core::get_mark_px(admin_addr, pair_id)
    const pairId = Number(req.query.pair || '1');
    const func = `${PERP_MODULE_ADDR}::perp_core::get_mark_px`;
    const out: any = await aptosClientSingleton.aptos.view({ payload: { function: func, functionArguments: [PERP_MODULE_ADDR, pairId] } as any });
    res.json({ pairId, markPx: out?.[0] });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// GET position
app.get('/api/perp/position', async (req, res) => {
  try {
    if (!PERP_MODULE_ADDR) return res.status(400).json({ error: 'PERP_MODULE_ADDR not configured' });
    const pairId = Number(req.query.pair || '1');
    const user = (req.query.user as string) || '';
    if (!user) return res.status(400).json({ error: 'user required' });
    const func = `${PERP_MODULE_ADDR}::perp_core::get_position`;
    const out: any = await aptosClientSingleton.aptos.view({ payload: { function: func, functionArguments: [PERP_MODULE_ADDR, pairId, user] } as any });
    res.json({ pairId, user, position: out?.[0] || null });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// POST open position
app.post('/api/perp/open', async (req, res) => {
  try {
    if (!PERP_MODULE_ADDR) return res.status(400).json({ error: 'PERP_MODULE_ADDR not configured' });
    if (!adminAccount) return res.status(400).json({ error: 'ADMIN_PRIVATE_KEY not configured' });
    const { user, pairId = 1, size, side, lev_bps, margin } = req.body || {};
    if (!user || size == null || side == null || !lev_bps || margin == null) return res.status(400).json({ error: 'missing fields' });
    const func = `${PERP_MODULE_ADDR}::perp_core::open_position`;
    const payload = { function: func, functionArguments: [PERP_MODULE_ADDR, user, Number(pairId), Number(size), Number(side), Number(lev_bps), Number(margin), 0] } as any;
    const { txn } = await aptosClientSingleton.simulate(adminAccount!, payload);
    const hash = await aptosClientSingleton.submit(adminAccount!, txn);
    res.json({ hash });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});

// POST close position (full or partial)
app.post('/api/perp/close', async (req, res) => {
  try {
    if (!PERP_MODULE_ADDR) return res.status(400).json({ error: 'PERP_MODULE_ADDR not configured' });
    if (!adminAccount) return res.status(400).json({ error: 'ADMIN_PRIVATE_KEY not configured' });
    const { user, pairId = 1, size } = req.body || {};
    if (!user || size == null) return res.status(400).json({ error: 'missing fields' });
    const func = `${PERP_MODULE_ADDR}::perp_core::close_position`;
    const payload = { function: func, functionArguments: [PERP_MODULE_ADDR, user, Number(pairId), Number(size)] } as any;
    const { txn } = await aptosClientSingleton.simulate(adminAccount!, payload);
    const hash = await aptosClientSingleton.submit(adminAccount!, txn);
    res.json({ hash });
  } catch (e: any) {
    res.status(500).json({ error: e.message || String(e) });
  }
});
