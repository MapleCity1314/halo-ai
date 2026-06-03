# Streaming

Halo supports streaming via `agent.stream()` and provides SSE protocol conversion via `toDataStream()`.

## Basic Streaming

```ts
const stream = agent.stream("Tell me a story about a robot.");

for await (const chunk of stream) {
  switch (chunk.type) {
    case "text-delta":
      process.stdout.write(chunk.delta);
      break;
    case "tool-call-delta":
      console.log(`Tool: ${chunk.name}`, chunk.argumentsDelta);
      break;
    case "tool-call-ready":
      console.log("Tool call complete:", chunk.call);
      break;
    case "done":
      console.log("Usage:", chunk.usage);
      break;
  }
}
```

## TurnChunk Types

| Type | Fields | Description |
|---|---|---|
| `text-delta` | `delta: string` | A text fragment from the model |
| `tool-call-delta` | `index, name?, argumentsDelta?` | Incremental tool call data |
| `tool-call-ready` | `index, call: ToolCall` | A complete tool call |
| `done` | `usage: Usage` | Stream finished with usage stats |

## With toDataStream (Vercel AI SDK Compatible)

```ts
import { toDataStream } from "@halo-ai/stream";

// In a Next.js API route
export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = halo.agent({ system: "..." });
  return toDataStream(agent.sdkStream(messages));
}
```

`toDataStream()` converts `TurnChunk` to the Vercel AI SDK SSE protocol:

```
0:"Hello"           ← text-delta
0:" world"          ← text-delta
9:[{...}]           ← tool-call-delta
d:{"usage":{...}}   ← done
```

This makes Halo's streaming output directly compatible with `useChat()` from `@ai-sdk/react`.

## createHaloStream

For custom streaming scenarios that don't go through `HaloAgent`:

```ts
import { createHaloStream } from "@halo-ai/stream";

const stream = createHaloStream(async (ctrl) => {
  ctrl.writeText("Hello ");
  ctrl.writeText("world!");
  ctrl.close({ promptTokens: 10, completionTokens: 2 });
});

// stream is a ReadableStream
```

::: warning Caching Note
Streaming uses the same prefix/history split as `chat()`. Prefix tokens are still cached. The streaming endpoint on the provider side reuses the same KV-cache.
:::

## Stream Stats

::: warning Currently
`agent.stream()` does not update `agent.stats`. Use `agent.send()` or `agent.run()` for cumulative stats tracking. The `done` chunk contains per-request `usage` data.
:::
