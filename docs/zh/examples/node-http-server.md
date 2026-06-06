# Node.js HTTP 服务器

零依赖的 Node.js HTTP 服务器 + Halo 流式输出。仅使用 `node:http` 内置模块。

> 📂 源码: [`examples/node-http-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/node-http-server)

## 两种 SSE 消费路径

| 端点                        | 消费路径             | 输出格式                    |
| --------------------------- | -------------------- | --------------------------- |
| `POST /api/chat`            | `.toDataStream()`    | AI SDK SSE (`0:`/`9:`/`d:`) |
| `POST /api/chat/custom-sse` | `.toAsyncIterable()` | 自定义 SSE 事件             |

## 核心特性

- **零框架**: 仅 `node:http` + `@halo-sdk/core` + `@halo-sdk/adapters`
- **Cache-first**: `StablePrefix` 被 DeepSeek 缓存
- **两种 SSE 格式**: AI SDK 协议 和 自定义事件流

## 代码

```ts
import { createServer } from "node:http";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

createServer(async (req, res) => {
  // POST /api/chat — toDataStream（AI SDK SSE 协议）
  if (req.method === "POST" && req.url === "/api/chat") {
    const { messages } = JSON.parse(await readBody(req));

    const agent = halo.agent({
      messages: [{ role: "system", content: "你是一个有用的助手。" }],
      tools: {
        get_weather: tool({
          /* ... */
        }),
      },
    });

    const response = agent.streamText(messages).toDataStream();
    // 转发 SSE response...
  }

  // POST /api/chat/custom-sse — toAsyncIterable（自定义事件）
  if (req.method === "POST" && req.url === "/api/chat/custom-sse") {
    const stream = agent.streamText(messages);
    for await (const chunk of stream.toAsyncIterable()) {
      if (chunk.type === "text-delta")
        res.write(`event: text\ndata: ${JSON.stringify(chunk.delta)}\n\n`);
    }
    res.end();
  }
}).listen(8080);
```

## 运行

```bash
cd examples/node-http-server
cp .env.example .env
pnpm install && pnpm dev
```

```bash
curl -X POST http://localhost:8080/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"巴黎天气怎么样？"}]}'
```
