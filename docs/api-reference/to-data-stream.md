# `toDataStream` + `createHaloStream`

Stream utilities for SSE protocol conversion and custom streaming.

## Import

```ts
import { toDataStream, createHaloStream } from "@halo-ai/stream";
```

## `toDataStream(source, opts?)`

Wraps an `AsyncGenerator<TurnChunk>` as an SSE `Response`. Compatible with Vercel AI SDK's `useChat`.

```ts
toDataStream(
  source: AsyncGenerator<TurnChunk>,
  opts?: { headers?: Record<string, string> }
): Response
```

### SSE Protocol

| TurnChunk | SSE Output |
|---|---|
| `text-delta` | `0:"<delta>"` |
| `tool-call-delta` | `9:[<chunk>]` |
| `tool-call-ready` | `9:[<chunk>]` |
| `done` | `d:{"usage":{...}}` |

### Usage

```ts
// In a Next.js API route
const stream = agent.sdkStream(messages);
return toDataStream(stream);
```

## `createHaloStream(fn)`

Custom stream entry without going through `HaloAgent`.

```ts
createHaloStream(
  fn: (ctrl: {
    writeText: (delta: string) => void;
    writeToolCall: (call: ToolCall) => void;
    close: (usage?: Usage) => void;
    error: (err: Error) => void;
  }) => Promise<void>
): ReadableStream
```

### Usage

```ts
const stream = createHaloStream(async (ctrl) => {
  ctrl.writeText("Processing... ");
  await someAsyncWork();
  ctrl.writeText("Done!");
  ctrl.close({ promptTokens: 10, completionTokens: 5 });
});
```
