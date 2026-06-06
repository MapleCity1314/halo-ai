# Node.js HTTP Server + Halo

A zero-dependency Node.js HTTP server with Halo streaming. Uses only `node:http` built-in — no Express, no Fastify, no Hono.

Demonstrates **two SSE consumption paths**:

- `toDataStream()` → AI SDK protocol (`0:`/`9:`/`d:` format)
- `toAsyncIterable()` → custom SSE events (`event: text`, `event: tool`, `event: done`)

## Architecture

```
POST /api/chat                    POST /api/chat/custom-sse
  streamText()                      streamText()
    .toDataStream()                   .toAsyncIterable()
    → AI SDK 0:/d: SSE              → custom event: SSE
```

Both share the same **cache-first** foundation: system prompt + tool specs are cached by DeepSeek via `StablePrefix`.

## Quick Start

```bash
pnpm install
pnpm build
cp .env.example .env  # add DEEPSEEK_API_KEY
pnpm dev
```

## Test with curl

```bash
# Standard SSE (AI SDK protocol)
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Weather in Paris?"}]}'

# Custom SSE format
curl -X POST http://localhost:8080/api/chat/custom-sse \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello!"}]}'

# Stats
curl http://localhost:8080/stats
```

## Files

| File            | Purpose                                     |
| --------------- | ------------------------------------------- |
| `src/server.ts` | HTTP server — two SSE paths, stats endpoint |
| `.env.example`  | Required: `DEEPSEEK_API_KEY`                |
