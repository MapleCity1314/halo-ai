# Node.js HTTP Server

A zero-dependency Node.js HTTP server with Halo streaming. Uses only `node:http` built-in.

> 📂 Source: [`examples/node-http-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/node-http-server)

## Two SSE Consumption Paths

| Endpoint                    | Consumption path     | Output                      |
| --------------------------- | -------------------- | --------------------------- |
| `POST /api/chat`            | `.toDataStream()`    | AI SDK SSE (`0:`/`9:`/`d:`) |
| `POST /api/chat/custom-sse` | `.toAsyncIterable()` | Custom SSE events           |

## Key Features

- **Zero framework**: Only `node:http`, `@halo-sdk/core`, `@halo-sdk/adapters`
- **Cache-first**: `StablePrefix` cached by DeepSeek
- **Two SSE formats**: AI SDK protocol and custom event stream

## Code

```ts
import { createServer } from "node:http";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

createServer(async (req, res) => {
  // POST /api/chat — toDataStream (AI SDK SSE protocol)
  if (req.method === "POST" && req.url === "/api/chat") {
    const { messages } = JSON.parse(await readBody(req));

    const agent = halo.agent({
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      tools: {
        get_weather: tool({
          /* ... */
        }),
      },
    });

    const response = agent.streamText(messages).toDataStream();
    res.writeHead(response.status, {
      "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
    });
    // pipe response body...
  }

  // POST /api/chat/custom-sse — toAsyncIterable (custom events)
  if (req.method === "POST" && req.url === "/api/chat/custom-sse") {
    const stream = agent.streamText(messages);
    res.writeHead(200, { "Content-Type": "text/event-stream" });

    for await (const chunk of stream.toAsyncIterable()) {
      if (chunk.type === "text-delta")
        res.write(`event: text\ndata: ${JSON.stringify(chunk.delta)}\n\n`);
      if (chunk.type === "done") res.write(`event: done\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
    }
    res.end();
  }
}).listen(8080);
```

## Running

```bash
cd examples/node-http-server
cp .env.example .env
pnpm install && pnpm dev
```

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Weather in Paris?"}]}'
```
