# Why Halo?

Comparing Halo with other approaches to building AI agents.

## Halo vs Raw API Calls

```ts
// ❌ Raw API: manual cache management, DIY loop, no tracking
const messages = [
  { role: "system", content: "You are..." },
  ...toolsAsMessages,
  ...history,
];
const res = await fetch("https://api.deepseek.com/chat/completions", {
  body: JSON.stringify({ messages, tools }),
});
// Is caching working? No idea.
// Tool calls returned? Need to write the loop yourself.
// Cost tracking? Manually from usage fields.
```

```ts
// ✅ Halo: automatic cache, agent loop, tracked stats
const agent = halo.agent({ system: "You are...", tools: { ... } });
const result = await agent.run("Do the task");
console.log(agent.stats.caching?.cacheHitRate); // 0.92
console.log(agent.stats.caching?.estimatedSavingsUsd); // $0.023
```

## Halo vs Vercel AI SDK

| | Halo | Vercel AI SDK |
|---|---|---|
| **Focus** | Cache-first agent runtime | Provider-agnostic LLM toolkit |
| **Caching** | Built-in StablePrefix, auto-managed | Manual via `experimental_cache` options |
| **Agent Loop** | `agent.run()` — auto tool execution | Manual with `maxSteps` + tool handling |
| **Cost Tracking** | `agent.stats.caching` built in | Manual from usage |
| **Provider Model** | Adapters with cache strategies | Provider packages |
| **SSE Protocol** | Compatible via `toDataStream()` | Native `0:`/`d:` protocol |
| **Best For** | Agent-heavy apps, cost-sensitive, multi-turn | General LLM apps, broad provider support |

The two are complementary — Halo's `toDataStream()` makes it compatible with Vercel AI SDK's `useChat()`.

## Halo vs LangChain

| | Halo | LangChain |
|---|---|---|
| **Philosophy** | Minimal, cache-first | Maximal, abstraction-heavy |
| **Bundle Size** | ~5KB per package | 500KB+ |
| **Caching** | Automatic prefix cache | Manual LCEL caching |
| **Learning Curve** | ~5 minutes | Hours to days |
| **Debugging** | Direct adapter code, visible HTTP | Deep chain abstraction |

## When to Choose Halo

- You're building **multi-turn agents** with tool calling
- You care about **token costs** and want automatic savings tracking
- You use **DeepSeek** (or plan to support multiple providers)
- You want a **minimal, auditable codebase** (zero external dependencies in core)
- You're shipping to **production** and need keep-alive, stats, and error events

## When Not to Choose Halo

- You need **structured output generation** (JSON mode, objects) — use Vercel AI SDK
- You need **embeddings, image generation, or speech** — use provider SDKs directly
- You're doing a **single-shot prompt** with no conversation — raw API is fine
