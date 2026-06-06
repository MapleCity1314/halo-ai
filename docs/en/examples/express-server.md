# Express Server

A minimal Express.js server with Halo **cache-first** streaming and tool auto-execute.

> 📂 Source: [`examples/express-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/express-server)

## Key Features

- **Cache-first**: System prompt + tool specs form a `StablePrefix` — DeepSeek caches it server-side
- **Tool auto-execute**: Tools with `execute` run automatically — no manual tool loop
- **streamText**: Primary streaming API with named callbacks (replaces deprecated `sdkStream`)
- **Stats endpoint**: Monitor cache hit rate and token usage at `GET /stats`

## Code

```ts
import "dotenv/config";
import express from "express";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const app = express();
app.use(express.json());

/**
 * POST /api/chat — Cache-first SSE streaming
 *
 * StablePrefix (cached):     system prompt + tool specs
 * MessageLog (uncached):     conversation history
 */
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    tools: {
      get_weather: tool({
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }) => {
          const data: Record<string, string> = { beijing: "5°C, clear", tokyo: "8°C, rain" };
          return data[city.toLowerCase()] ?? `${city}: 20°C, sunny`;
        },
      }),
    },
  });

  // streamText returns StreamTextResult with multiple consumption paths
  const response = agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) => console.log(`Done: ${steps} steps`),
    })
    .toDataStream(); // AI SDK-compatible SSE (0:/9:/d: protocol)

  // Forward SSE to Express response
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  const reader = response.body!.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
});

app.get("/stats", (_req, res) => {
  const agent = halo.agent({
    messages: [{ role: "system", content: "Stats probe." }],
  });
  res.json(agent.stats);
});

app.listen(3000);
```

## Running

```bash
cd examples/express-server
cp .env.example .env  # add DEEPSEEK_API_KEY
pnpm install && pnpm dev
```

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Weather in Tokyo?"}]}'
```
