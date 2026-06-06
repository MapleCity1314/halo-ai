# @halo-sdk/stream

Streaming utilities for Halo AI SDK — SSE Response compatible with Vercel AI SDK.

## Installation

```bash
npm install @halo-sdk/stream
```

Requires `@halo-sdk/core` as a peer dependency.

## toDataStream

Convert a Halo `streamText()` result to an SSE Response compatible with `useChat`:

```ts
import { Halo } from "@halo-sdk/core";
import { toDataStream } from "@halo-sdk/stream";

// In Next.js API route:
export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
  });

  return agent.streamText(messages).toDataStream();
  // → SSE Response with 0:/9:/d: protocol
}
```

### SSE Protocol

| Prefix | Content                    |
| ------ | -------------------------- |
| `0:`   | Text delta                 |
| `9:`   | Tool call (delta or ready) |
| `d:`   | Done with usage stats      |

Fully compatible with the Vercel AI SDK `useChat` hook.

## createHaloStream

Low-level stream factory for custom streaming use cases:

```ts
import { createHaloStream } from "@halo-sdk/stream";

const stream = createHaloStream(async (ctrl) => {
  ctrl.writeText("Hello ");
  ctrl.writeText("world!");
  ctrl.close({ promptTokens: 10, completionTokens: 5 });
});

// stream is a ReadableStream<string>
```

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/en/api-reference/to-data-stream) for full API reference.
