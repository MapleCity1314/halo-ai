# Error Handling

How Halo handles errors and how to hook into them.

## Agent Events

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  on: (event, payload) => {
    switch (event) {
      case "cache:miss":
        console.warn("Cache miss detected:", payload);
        break;
      case "context:truncated":
        console.warn("Context was truncated:", payload.droppedCount, "messages dropped");
        break;
      case "repair:applied":
        console.warn("Tool calls were repaired:", payload.notes);
        break;
    }
  },
});
```

| Event | Payload | When |
|---|---|---|
| `cache:miss` | `{ type, detail }` | Cache miss tokens detected (after turn 1) |
| `context:truncated` | `{ droppedCount, summary? }` | ContextStrategy truncated history |
| `repair:applied` | `{ fixed, suppressed, notes }` | RepairStrategy modified tool calls |

## Common Errors

### API Key Missing

```ts
// DeepSeekAdapter throws if DEEPSEEK_API_KEY is undefined
const adapter = new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! });
// Use ! only if you're sure the env var is set
```

### Context Window Exceeded

If the combined prefix + history exceeds the model's `contextWindow`:

```ts
// Solution 1: Use TruncateStrategy
import { TruncateStrategy } from "@halo-ai/strategies";
const agent = halo.agent({ context: new TruncateStrategy({ maxTokens: 100_000 }) });

// Solution 2: Clear log periodically
agent.clearLog(); // Resets history, preserves cache
```

### Malformed Tool Calls

LLMs sometimes produce truncated JSON in tool arguments:

```ts
// Solution: Use BasicRepair
import { BasicRepair } from "@halo-ai/strategies";
const agent = halo.agent({ repair: new BasicRepair() });
```

### Network Errors

Adapter-level errors propagate up. Wrap calls in try/catch:

```ts
try {
  const result = await agent.run("...");
} catch (err) {
  if (err instanceof Error && err.message.includes("429")) {
    // Rate limited — implement backoff
    await sleep(1000);
    return agent.send("...");
  }
  throw err;
}
```

## Tool Error Results

Mark tool results as errors to let the model know:

```ts
await agent.submitToolResult({
  toolCallId: call.id,
  output: "Failed to connect to weather API: timeout after 30s",
  isError: true,
});
// The model will see this and try an alternative approach
```

## Stats as Health Check

Monitor agent health via stats:

```ts
if (agent.stats.turns > 100) {
  console.warn("Agent has run 100+ turns — consider clearLog() or TruncateStrategy");
}
if (agent.stats.caching && agent.stats.caching.cacheHitRate < 0.3) {
  console.warn("Low cache hit rate — check if prefix is changing between calls");
}
```
