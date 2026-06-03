# Express Server

A minimal Express.js server with Halo streaming.

```ts
import express from "express";
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const app = express();
app.use(express.json());

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `${city}: 22°C, sunny`,
    }),
  },
});

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const response = toDataStream(agent.sdkStream(messages));

  // Forward SSE headers and stream
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  const reader = response.body?.getReader();
  if (!reader) return res.end();

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

app.get("/stats", (req, res) => {
  res.json(agent.stats);
});

app.listen(3000, () => {
  console.log("Halo Express server on http://localhost:3000");
  console.log("POST /api/chat — send { messages: [...] }");
  console.log("GET  /stats    — agent statistics");
});
```
