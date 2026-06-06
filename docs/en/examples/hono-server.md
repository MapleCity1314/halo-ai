# Hono Server

A [Hono](https://hono.dev/) server with Halo streaming, showcasing **three consumption paths** from `streamText()`.

> 📂 Source: [`examples/hono-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/hono-server)

## Three Consumption Paths

| Endpoint                         | Method                | Output        |
| -------------------------------- | --------------------- | ------------- |
| `POST /api/chat`                 | `.toDataStream()`     | AI SDK SSE    |
| `POST /api/chat/readable-stream` | `.toReadableStream()` | Binary stream |
| `POST /api/chat/async-iterable`  | `.toAsyncIterable()`  | NDJSON lines  |

## Key Features

- **Hono**: Fast, lightweight web framework with native `Response` support
- **CORS**: Pre-configured for `localhost:3000` (Next.js dev server)
- **Multiple paths**: Demonstrate all `StreamTextResult` consumption methods

## Code

```ts
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const app = new Hono();
app.use("/api/chat/*", cors({ origin: ["http://localhost:3000"] }));

// SSE (AI SDK protocol)
app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
    tools: {
      get_weather: tool({
        /* ... */
      }),
    },
  });
  return agent.streamText(messages).toDataStream();
});

// NDJSON (one JSON chunk per line)
app.post("/api/chat/async-iterable", async (c) => {
  const stream = agent.streamText(messages);
  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream.toAsyncIterable()) {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
      }
      controller.close();
    },
  });
  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
});

serve({ fetch: app.fetch, port: 8080 });
```

## Running

```bash
cd examples/hono-server
cp .env.example .env
pnpm install && pnpm dev
```
