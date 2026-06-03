# Cache Keep-Alive

Server-side KV caches have a Time-To-Live (TTL). If no requests are made within the TTL window, the cache expires. `keepAlive()` solves this for long-running tasks.

## The Problem

```ts
const agent = halo.agent({ system: "...", tools: { ... } });

await agent.run("Start analysis..."); // Cache is warm
// ... 5 minutes of processing (external API calls, data crunching) ...
await agent.run("Continue analysis..."); // Cache EXPIRED — cold start!
```

During those 5 minutes, DeepSeek's KV-cache expired. The second call pays full price for the prefix tokens.

## The Solution

```ts
const agent = halo.agent({ system: "...", tools: { ... } });
const keepAlive = agent.keepAlive(); // Pings every 120s (default)

await agent.run("Start analysis...");
// ... 5 minutes of processing ...
await agent.run("Continue analysis..."); // Cache still WARM

keepAlive.stop();
```

## How It Works

`keepAlive()` sends a periodic "ping" to the API:

```
prefix.toMessages() + [{ role: "user", content: "ping" }]
```

Since the prefix matches, DeepSeek returns a cache hit. The ping response is discarded. This keeps the KV-cache alive without affecting the conversation history.

## Custom Interval

```ts
const keepAlive = agent.keepAlive(30_000); // Ping every 30 seconds
```

## Provider-Specific Behavior

| Provider | Default keepAlive | Notes |
|---|---|---|
| DeepSeek | Periodic ping (works) | Prefix matching keeps cache warm |
| OpenAI | Periodic ping (works) | Automatic caching responds to pings |
| Anthropic | Needs custom implementation | Requires `cache_control` markers on ping |
| Gemini | Needs custom implementation | Requires `CachedContents.patch` API call |

For providers that need custom keep-alive, implement `keepAlive()` on the adapter:

```ts
class GeminiAdapter implements ModelAdapter {
  keepAlive(prefix: ChatMessage[]) {
    // Call Gemini's CachedContents.patch to extend TTL
    const interval = setInterval(() => {
      fetch(`https://generativelanguage.googleapis.com/v1beta/${cacheName}`, {
        method: "PATCH",
        body: JSON.stringify({ ttl: "300s" }),
      });
    }, 120_000);
    return { stop: () => clearInterval(interval) };
  }
}
```

The session automatically delegates to `adapter.keepAlive()` when available, falling back to the default ping strategy.
