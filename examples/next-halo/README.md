# Halo Chat — Next.js Example

Minimal chat application powered by **Halo AI SDK** + **DeepSeek** + **Next.js App Router**.

## Quick Start

```bash
# 1. Install dependencies (from repo root)
pnpm install

# 2. Build Halo packages
pnpm build

# 3. Set your API key
cp examples/next-halo/.env.local.example examples/next-halo/.env.local
# Edit .env.local → add your DEEPSEEK_API_KEY

# 4. Start dev server
cd examples/next-halo
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Architecture

```
useChat()                         POST /api/chat
(@ai-sdk/react) ──────────────►  route.ts
                                  │
                                  ├─ createWeatherAgent()
                                  │    ├─ agent/weather-agent.ts  (Halo factory)
                                  │    └─ tool/weather-tool.ts    (Tool def + execute)
                                  │
                                  └─ streamText(messages)
                                       .toDataStream()
                                       → SSE (0:/d: protocol)
```

### Modular design

| Layer | File                     | Responsibility                  |
| ----- | ------------------------ | ------------------------------- |
| Tool  | `tool/weather-tool.ts`   | Tool spec + execute function    |
| Agent | `agent/weather-agent.ts` | Halo factory + agent definition |
| Route | `app/api/chat/route.ts`  | Parse request → stream → return |

This separation makes tools **reusable across agents** and agents **testable in isolation**.

### Cache-first

The API route creates a fresh agent per request. Since the **system prompt + tool specs** are identical, the `StablePrefix` fingerprint matches → DeepSeek reuses the KV-cache. Only the conversation history counts as uncached tokens.

### streamText (preferred API)

Replaces the deprecated `sdkStream()`. `streamText()` supports:

- Named callbacks (`onFinish`, `onError`, `onStepFinish`, `onChunk`)
- Multiple consumption paths (`.toDataStream()`, `.toAsyncIterable()`, `.text`, `.usage`)
- Full tool-call loop with auto-execute

## Files

| File                     | Purpose                                         |
| ------------------------ | ----------------------------------------------- |
| `agent/weather-agent.ts` | Agent factory — Halo + DeepSeekAdapter + tools  |
| `tool/weather-tool.ts`   | Weather tool — spec + typed execute             |
| `app/api/chat/route.ts`  | SSE endpoint — streamText + toDataStream        |
| `app/page.tsx`           | Chat page shell                                 |
| `app/layout.tsx`         | Root layout with Tailwind                       |
| `components/chat.tsx`    | Chat UI — useChat hook, message bubbles, inputs |
| `.env.local.example`     | Required env: `DEEPSEEK_API_KEY`                |
