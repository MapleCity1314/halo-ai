# Cache-First Design

Halo's defining philosophy: **separate stable content from dynamic content** to maximize cache hits.

## The Problem

Every API call to an LLM includes:

- **System prompt** — instructions for the model
- **Tool definitions** — JSON Schema for available tools
- **Conversation history** — user and assistant messages

The system prompt and tool definitions rarely change between turns. But in a typical implementation, they're re-sent in every request — and billed at full price every time.

## The Solution

Halo splits messages into two layers:

```
┌──────────────────────────────────┐
│  StablePrefix (CACHED)           │
│  ┌────────────────────────────┐  │
│  │ system: "You are..."       │  │  ← Billed at cached rate
│  │ tools: [get_weather, ...]  │  │     (~74% discount)
│  │ fewShots: [...]            │  │
│  └────────────────────────────┘  │
├──────────────────────────────────┤
│  MessageLog (UNCACHED)           │
│  ┌────────────────────────────┐  │
│  │ user: "What's the weather?"│  │  ← Billed at full rate
│  │ assistant: "It's sunny..." │  │
│  │ user: "And in Paris?"      │  │
│  └────────────────────────────┘  │
└──────────────────────────────────┘
```

The prefix is always at position 0 in the message array. Providers that support prefix caching (DeepSeek, OpenAI, Anthropic with markers) detect this and reuse the KV-cache for the prefix.

## What Triggers a Cache Miss

| Action | Cache Miss? |
|---|---|
| New user message | No — history appended after prefix |
| `agent.clearLog()` | No — only history reset, prefix unchanged |
| `agent.addTool(...)` | Yes — prefix changed (next turn only) |
| `agent.setSystem(...)` | Yes — prefix changed |
| `agent.addFewShot(...)` | Yes — prefix changed |
| New API key / new session | Yes — cold start |

## Measuring Cache Performance

```ts
const agent = halo.agent({ system: "...", tools: { ... } });

await agent.run("First message");
await agent.run("Second message");

console.log(agent.stats.caching);
// {
//   totalCacheHitTokens: 8000,
//   totalCacheMissTokens: 2000,
//   cacheHitRate: 0.8,
//   estimatedSavingsUsd: 0.0016
// }
```

## Provider-Specific Behavior

| Provider | How Prefix is Cached |
|---|---|
| DeepSeek | Auto-detected at position 0 |
| OpenAI | Auto-detected (>1024 token prompts) |
| Anthropic | Explicit `cache_control` markers on prefix messages |
| Gemini | Separate `CachedContent` resource from prefix |
| Others | `[...prefix, ...history]` — caching if provider supports it |

For providers without caching, the prefix/history split is harmless — messages arrive in the correct order regardless.
