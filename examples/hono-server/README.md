# Hono Server + Halo

A [Hono](https://hono.dev/) server with Halo streaming, showcasing **three consumption paths** from `streamText()`:

| Endpoint                         | Consumption path      | Output format                    |
| -------------------------------- | --------------------- | -------------------------------- |
| `POST /api/chat`                 | `.toDataStream()`     | AI SDK SSE (`0:`/`9:`/`d:`)      |
| `POST /api/chat/readable-stream` | `.toReadableStream()` | Binary stream                    |
| `POST /api/chat/async-iterable`  | `.toAsyncIterable()`  | NDJSON (one JSON chunk per line) |

## Architecture

```
streamText(input)
  ├─ .toDataStream()        → Response (SSE)         → useChat / AI SDK clients
  ├─ .toReadableStream()    → ReadableStream<Uint8>  → file pipe, custom transport
  ├─ .toAsyncIterable()     → AsyncIterable<Chunk>   → full per-chunk control
  ├─ .text                  → Promise<string>        → final text only
  └─ .usage                 → Promise<Usage>         → token counts
```

All paths share the same **cache-first** foundation: `StablePrefix` caches system prompt + tools; only conversation history is uncached.

## Quick Start

```bash
pnpm install
pnpm build
cp .env.example .env  # add DEEPSEEK_API_KEY
pnpm dev
```

## Test with curl

```bash
# SSE (AI SDK protocol)
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Weather in Tokyo?"}]}'

# NDJSON (one chunk per line)
curl -X POST http://localhost:8080/api/chat/async-iterable \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"What time is it?"}]}'

# Health check
curl http://localhost:8080/health
```

## Files

| File            | Purpose                                           |
| --------------- | ------------------------------------------------- |
| `src/server.ts` | Hono server — 3 consumption paths + CORS + health |
| `.env.example`  | Required: `DEEPSEEK_API_KEY`                      |
