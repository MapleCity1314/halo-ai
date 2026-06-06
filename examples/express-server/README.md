# Express Server + Halo

A minimal Express.js server with Halo **cache-first** streaming and tool auto-execute.

## Architecture

```
POST /api/chat                    StablePrefix (cached)
  ┌──────────┐                    ┌─────────────────────┐
  │ useChat  │ ── SSE ──►         │ System prompt        │
  │ (client) │                    │ Tool specs           │
  └──────────┘                    └─────────────────────┘
                                  MessageLog (uncached)
                                  ┌─────────────────────┐
                                  │ Conversation history │
                                  └─────────────────────┘
```

- **Cache-first**: System prompt + tool specs form a `StablePrefix` that DeepSeek caches server-side. Only the conversation history counts as uncached tokens.
- **Tool auto-execute**: Tools with `execute` functions run automatically — no manual tool loop.
- **streamText**: Primary streaming API with named callbacks (`onFinish`, `onError`).

## Quick Start

```bash
# 1. Install dependencies (from repo root)
pnpm install
pnpm build

# 2. Set your API key
cp .env.example .env
# Edit .env → DEEPSEEK_API_KEY=your-key

# 3. Run
pnpm dev
```

## Test with curl

```bash
# Send a chat message
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What is the weather in Tokyo?"}]}'

# Check agent stats
curl http://localhost:3000/stats
```

## Files

| File            | Purpose                                                         |
| --------------- | --------------------------------------------------------------- |
| `src/server.ts` | Express server — Halo setup, `/api/chat` SSE endpoint, `/stats` |
| `.env.example`  | Required: `DEEPSEEK_API_KEY`                                    |
