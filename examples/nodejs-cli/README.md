# Node.js CLI Agent + Halo

An interactive command-line agent powered by Halo with **cache-first** architecture, tool auto-execute, and keep-alive.

## Features

- **Cache-first**: Single agent instance — `StablePrefix` cached across all turns
- **Tool auto-execute**: `get_time`, `read_file`, `calculator` run automatically
- **Keep-alive**: Prevents DeepSeek KV-cache expiry during long sessions (~5 min default TTL)
- **Stats**: Type `/stats` to see cache hit rate, token usage, cost savings

## Architecture

```
┌────────────┐     generateText()     ┌──────────────────────┐
│   User     │ ────────────────────── │  HaloAgent            │
│  (stdin)   │                        │  ├─ StablePrefix (✓)  │
└────────────┘                        │  │  system + tools    │
                                      │  └────────────────────│
┌────────────┐     agent.stats        │  MessageLog           │
│  /stats    │ ◄───────────────────── │  conversation history │
└────────────┘                        └──────────────────────┘
```

## Quick Start

```bash
pnpm install
pnpm build
cp .env.example .env  # add DEEPSEEK_API_KEY
pnpm dev
```

## Example session

```
> What time is it?
🤖 The current time is 2026-03-17T14:30:00.000Z.

> Read the file package.json and summarize the project
🤖
   🔧 step 1: read_file
🤖 This is a CLI agent example using @halo-sdk/core v1.0.1 with DeepSeek adapter...

> /stats
  Turns: 2
  Prompt tokens: 1240
  Cache hits: 890 tokens
  Cache misses: 350 tokens
  Hit rate: 71.8%
  Estimated savings: $0.000125
```

## Files

| File           | Purpose                                                    |
| -------------- | ---------------------------------------------------------- |
| `src/main.ts`  | CLI entry — agent setup, readline loop, keep-alive, /stats |
| `.env.example` | Required: `DEEPSEEK_API_KEY`                               |
