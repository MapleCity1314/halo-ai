# `HaloAgent`

The core interaction unit. Manages prefix, log, tools, and strategies for a single conversation.

## Import

```ts
import { HaloAgent } from "@halo-ai/core";
```

## Constructor

```ts
new HaloAgent(opts: HaloAgentOptions)
```

See [Halo.agent()](/en/api-reference/halo#agent-opts) for options.

## Properties

### `stats`

```ts
get stats(): Readonly<SessionStats>
```

Current session statistics. Updated after every turn.

```ts
interface SessionStats {
  turns: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  caching?: {
    totalCacheHitTokens: number;
    totalCacheMissTokens: number;
    cacheHitRate: number;
    estimatedSavingsUsd: number | null;
  };
  pricingSnapshot: PricingSnapshot;
  recentDiagnostics: CacheMissReason[];
}
```

## Methods

### `run(input, opts?)`

Run a prompt with automatic tool-call loop.

```ts
agent.run(input: string, opts?: {
  maxSteps?: number;      // default: 10
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
  onStep?: (s: { step: number; content: string; toolCalls: ToolCall[] }) => void;
}): Promise<TurnResult>
```

### `send(input)`

Send a message. Returns tool calls for manual handling.

```ts
agent.send(input: string): Promise<TurnResult>
```

### `stream(input)`

Stream a response as an AsyncGenerator of TurnChunks.

```ts
agent.stream(input: string): AsyncGenerator<TurnChunk>
```

### `sdkStream(messages)`

AI SDK-compatible entry point. Accepts UIMessages from `useChat()`, hydrates prior history, streams response.

```ts
agent.sdkStream(messages: { role: string; content: string }[]): AsyncGenerator<TurnChunk>
```

### `submitToolResult(result)`

Feed a tool execution result back to the model.

```ts
agent.submitToolResult(result: ToolResult): Promise<TurnResult>
```

### `hydrate(messages)`

Restore conversation state from external history.

```ts
agent.hydrate(messages: ChatMessage[]): void
```

### `addTool(spec)` / `addTool(name, def)`

Add a tool. Triggers cache miss on next turn.

### `removeTool(name)`

Remove a tool. Triggers cache miss on next turn.

### `addFewShot(msg)` / `removeFewShot(index)`

Manage few-shot examples. Triggers cache miss on next turn.

### `keepAlive(intervalMs?)`

Start periodic pings to maintain server-side KV cache.

```ts
agent.keepAlive(intervalMs?: number): { stop: () => void }
```

### `clearLog()`

Reset conversation history. Prefix is **not** affected â€?cache stays warm.

### `setSystem(system)`

Change the system prompt. **Triggers cache miss.**

## Examples

### Agent Loop

```ts
const result = await agent.run("What's the weather in Paris?");
// Agent auto-executes get_weather, feeds result, gets final answer
```

### Manual Tool Handling

```ts
const turn1 = await agent.send("What's the weather?");
const weather = await myApi(turn1.toolCalls[0]);
const turn2 = await agent.submitToolResult({
  toolCallId: turn1.toolCalls[0].id,
  output: weather,
});
```

### SDK Integration

```ts
// In Next.js API route
const agent = halo.agent({ system: "...", tools: { ... } });
return toDataStream(agent.sdkStream(messages));
```

