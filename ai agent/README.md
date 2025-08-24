# Prompt-to-Action Agent

## API Key Placement

1. Copy `.env.example` to `.env` and set at least one provider key:
```
DEEPSEEK_API_KEY=sk-deepseek-...
# or
OPENAI_API_KEY=sk-openai-...
```
2. (Optional) Override DeepSeek model with `DEEPSEEK_MODEL=deepseek-chat` (default) or another.
3. Never commit `.env`.
4. Start server (dotenv auto-loaded via `import 'dotenv/config'` in `server/index.ts`).

## Dev Server

```
npm run dev
```
POST JSON to:
```
POST http://localhost:3000/api/parse { "prompt": "Send 5 APT to 0xABC" }
```

Health check:
```
GET http://localhost:3000/health
```
Diagnostics:
```
GET http://localhost:3000/debug/ai
```
Shows which provider is active (no secrets).

## Where the key is read
`src/intents/normalizer.ts` auto-selects provider priority: DeepSeek > explicit > OpenAI > generic.
`server/index.ts` re-initializes parser if env keys change on restart.

## DO NOT Hardcode
Never paste raw keys into source files or push them to version control.

## Quick Local Test
After setting `.env` run:
```
npm run dev
```
Then in another shell:
```
Invoke-WebRequest -UseBasicParsing -Uri http://localhost:3000/health
```
