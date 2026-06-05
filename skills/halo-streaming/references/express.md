# Express — Streaming Patterns

## Basic SSE Endpoint

```ts
import express from "express";
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
  });

  // Use toDataStream for AI SDK compatible SSE
  const response = agent.streamText(messages).toDataStream();

  // Forward headers
  res.status(response.status);
  response.headers.forEach((value, key) => res.setHeader(key, value));

  // Pipe body
  if (response.body) {
    const reader = response.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
});
```

## Middleware: Authentication + Rate Limiting

```ts
import rateLimit from "express-rate-limit";

const limiter = rateLimit({
  windowMs: 60_000,
  max: 20,
  message: { error: "Too many requests" },
});

app.post("/api/chat", authenticate, limiter, async (req, res) => {
  // ...
});
```

## Agent Pool (Reuse for Cache Hits)

```ts
// Module-level agent pool
const agentPool = {
  default: halo.agent({
    messages: [{ role: "system", content: "Default assistant." }],
  }),
  code: halo.agent({
    messages: [{ role: "system", content: "Code assistant." }],
    tools: { readFile: sandbox.tools().readFile },
  }),
};

app.post("/api/chat", async (req, res) => {
  const { messages, agentType } = req.body;
  const agent = agentPool[agentType] ?? agentPool.default;

  agent.clearLog(); // Critical: reset conversation per request

  const response = agent.streamText(messages).toDataStream();
  // ... pipe response ...
});
```

**Cache benefit:** Reusing agent instances means `StablePrefix` is cached across requests after the first one. `clearLog()` only resets `MessageLog`, not the prefix.

## Custom Event Stream

For non-AI-SDK clients:

```ts
app.post("/api/chat", async (req, res) => {
  const { input } = req.body;

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
  });

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  for await (const chunk of agent.streamText(input).toAsyncIterable()) {
    switch (chunk.type) {
      case "text-delta":
        res.write(`data: ${JSON.stringify({ text: chunk.delta })}\n\n`);
        break;
      case "tool-call-ready":
        res.write(`data: ${JSON.stringify({ tool: chunk.call.function.name })}\n\n`);
        break;
      case "done":
        res.write(`data: ${JSON.stringify({ done: true, usage: chunk.usage })}\n\n`);
        break;
    }
  }

  res.end();
});
```

## Error Handling Middleware

```ts
app.post("/api/chat", async (req, res, next) => {
  try {
    const { messages } = req.body;
    const agent = halo.agent({ messages: [...] });

    const response = agent
      .streamText(messages, {
        onError: (err) => {
          console.error("Stream error:", err.message);
          // The stream will try to continue — onError is a notification, not a stop
        },
      })
      .toDataStream();

    // ...
  } catch (err) {
    next(err);
  }
});

// Express error handler
app.use((err, req, res, next) => {
  console.error("Unhandled:", err);
  res.status(500).json({ error: "Internal server error" });
});
```

## Graceful Shutdown

```ts
import { createMCPServer } from "@halo-sdk/mcp";

let mcpServer: Awaited<ReturnType<typeof createMCPServer>>;

const server = app.listen(3000, async () => {
  mcpServer = await createMCPServer({ transport: { ... } });
  console.log("Server ready on :3000");
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await mcpServer?.close();
  server.close();
});
```
