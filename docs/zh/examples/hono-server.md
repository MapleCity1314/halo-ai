# Hono 服务器

一个 [Hono](https://hono.dev/) 服务器 + Halo 流式输出，展示 `streamText()` 的**三种消费路径**。

> 📂 源码: [`examples/hono-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/hono-server)

## 三种消费路径

| 端点                             | 方法                  | 输出       |
| -------------------------------- | --------------------- | ---------- |
| `POST /api/chat`                 | `.toDataStream()`     | AI SDK SSE |
| `POST /api/chat/readable-stream` | `.toReadableStream()` | 二进制流   |
| `POST /api/chat/async-iterable`  | `.toAsyncIterable()`  | NDJSON 行  |

## 核心特性

- **Hono**: 快速、轻量的 Web 框架，原生支持 `Response`
- **CORS**: 预配置 `localhost:3000`（Next.js dev server）
- **多路径**: 展示所有 `StreamTextResult` 消费方法

## 代码

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

// SSE（AI SDK 协议）
app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json();
  const agent = halo.agent({
    messages: [{ role: "system", content: "你是有用的助手。" }],
    tools: {
      get_weather: tool({
        /* ... */
      }),
    },
  });
  return agent.streamText(messages).toDataStream();
});

// NDJSON（每行一个 JSON chunk）
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

## 运行

```bash
cd examples/hono-server
cp .env.example .env
pnpm install && pnpm dev
```
