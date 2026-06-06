# Express 服务器

一个带 Halo **cache-first** 流式输出和工具自动执行的 Express.js 服务器。

> 📂 源码: [`examples/express-server/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/express-server)

## 核心特性

- **Cache-first**: 系统提示词 + 工具规格组成 `StablePrefix`，DeepSeek 在服务端缓存
- **工具自动执行**: 带 `execute` 的工具自动运行，无需手动工具循环
- **streamText**: 主推的流式 API（替代已弃用的 `sdkStream`）
- **Stats 端点**: `GET /stats` 监控缓存命中率和 token 用量

## 代码

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
 * POST /api/chat — Cache-first SSE 流式
 *
 * StablePrefix (缓存):    system prompt + tool 规格
 * MessageLog (不缓存):    对话历史
 */
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    tools: {
      get_weather: tool({
        description: "获取城市天气",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }) => {
          const data: Record<string, string> = { beijing: "5°C, 晴", tokyo: "8°C, 小雨" };
          return data[city.toLowerCase()] ?? `${city}: 20°C, 晴`;
        },
      }),
    },
  });

  // streamText 返回 StreamTextResult，支持多种消费路径
  const response = agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) => console.log(`完成: ${steps} 步`),
    })
    .toDataStream(); // AI SDK 兼容 SSE (0:/9:/d: 协议)

  // 转发 SSE 到 Express response
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

## 运行

```bash
cd examples/express-server
cp .env.example .env  # 填入 DEEPSEEK_API_KEY
pnpm install && pnpm dev
```

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"东京天气怎么样？"}]}'
```

## 关键要点

- 每个请求创建新 agent 实例 — 相同的 `StablePrefix` 指纹确保 DeepSeek 复用 KV-cache
- `streamText` 替代已弃用的 `sdkStream`，支持命名回调（`onFinish`、`onError`）
- Express 需要手动转发 SSE Response 的 headers 和 body
- `/stats` 端点可监控缓存命中率
