# Express 服务器

一个带 Halo 流式输出的最小 Express.js 服务器。

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

  // 转发 SSE headers 和流
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
  console.log("Halo Express 服务器运行在 http://localhost:3000");
  console.log("POST /api/chat — 发送 { messages: [...] }");
  console.log("GET  /stats    — 查看 agent 统计");
});
```

## 关键要点

- Express 需要手动处理 SSE 流 — 使用 `toDataStream()` 生成标准响应，然后逐块转发给客户端
- 保持单个 agent 实例以充分利用前缀缓存
- `/stats` 端点可以监控缓存命中率和使用量
