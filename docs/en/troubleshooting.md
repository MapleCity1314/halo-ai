# Troubleshooting

## Common Issues

### Cache hit rate is low or zero

**Possible causes:**
- System prompt changed between requests → cache miss once, then re-caches
- Tools added/removed between requests → each mutation triggers a miss
- Using a provider without caching support → `agent.stats.caching` is `undefined`

**Fix:** Keep the system prompt and tool definitions stable across requests. Use `clearLog()` instead of creating new agents.

### `agent.stats.caching` is `undefined`

The adapter doesn't expose `pricing`. Without pricing data, the framework doesn't initialize caching stats. Add `pricing` to your adapter:

```ts
class MyAdapter implements ModelAdapter {
  readonly pricing = { inputPricePer1k: 0.001, cachedInputPricePer1k: 0.0001 };
}
```

### Type error: `ToolDefinition<{ city: string }>` not assignable

This happens when using the `Record<string, ToolDefinition>` tools format with specific generic types. Use `any` cast or ensure your tool function accepts `Record<string, unknown>`:

```ts
const agent = halo.agent({
  tools: {
    my_tool: tool({
      execute: async (args: Record<string, unknown>) => {
        const city = args.city as string;
        // ...
      },
    }),
  },
});
```

### Stream doesn't show progress in useChat

Make sure `toDataStream()` is used to wrap the stream. The raw `agent.stream()` returns `TurnChunk` format — `toDataStream()` converts it to the SSE protocol `useChat` expects.

### Context window exceeded

Use `TruncateStrategy` to automatically trim conversation history:

```ts
import { TruncateStrategy } from "@halo-ai/strategies";

const agent = halo.agent({
  context: new TruncateStrategy({ maxTokens: 100_000 }),
});
```

### Tools not executing in agent.run()

Make sure you either:
- Include `execute` in the `ToolDefinition`, or
- Pass `onToolCall` in the `run()` options

Without either, `run()` returns the tool calls without executing them.
