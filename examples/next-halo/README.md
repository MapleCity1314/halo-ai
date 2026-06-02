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
                                  ├─ DeepSeekAdapter
                                  ├─ adapter.stream(prefix, history)
                                  └─ toDataStream()
                                      │
◄────────────────────────────────────┘
    SSE (0:/d: protocol)
```

### Cache-first

The API route sends the **system prompt as a stable prefix** and the
**conversation as dynamic history**. DeepSeek's prefix caching automatically
reuses the KV-cache for the system prompt across requests, reducing token costs
by ~74%.

For production with tool calling and full cache tracking, see the
`HaloSession` pattern in the route's comment block.

## Files

| File | Purpose |
|---|---|
| `app/api/chat/route.ts` | SSE endpoint — adapter.stream + toDataStream |
| `app/page.tsx` | Chat page shell |
| `app/layout.tsx` | Root layout with Tailwind |
| `components/chat.tsx` | Chat UI — useChat hook, message bubbles, input |
| `.env.local.example` | Required env: `DEEPSEEK_API_KEY` |
