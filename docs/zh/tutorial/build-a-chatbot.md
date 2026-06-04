# 构建聊天机器人

分步构建一个带工具调用、流式输出和缓存优化的完整 AI 聊天机器人。

## 概览

在本教程中，你将构建一个能够：

- 以对话方式回答问题
- 查询任意城市的当前天气
- 查询任意时区的当前时间
- 实时流式输出响应
- 追踪并报告缓存节省量

你将使用 **Halo Core** 作为智能体引擎，**Halo Adapters** 连接 DeepSeek 提供商，以及一个简单的 Express 服务器作为后端。

---

## 第 1 步：搭建项目

```bash
mkdir halo-chatbot && cd halo-chatbot
pnpm init
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream express
pnpm add -D typescript @types/express @types/node tsx
```

创建 `tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

创建 `src/server.ts` — 这将是我们的应用入口。

---

## 第 2 步：初始化 Halo

```ts
// src/server.ts
import express from "express";
import { Halo, StablePrefix, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const app = express();
app.use(express.json());

const halo = new Halo({
  model: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-chat",
  }),
});
```

::: warning API 密钥
切勿硬编码 API 密钥。在环境变量中设置 `DEEPSEEK_API_KEY`：

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
:::

---

## 第 3 步：定义工具

```ts
const agent = halo.agent({
  system: `你是一个乐于助人的聊天助手。你可以：
- 回答一般性问题
- 查询任意城市的当前天气
- 告知任意时区的当前时间
请保持回复友好且简洁。`,

  tools: {
    get_weather: tool({
      description: "获取城市的当前天气",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "城市名称（如 'Tokyo', 'Paris'）",
          },
        },
        required: ["city"],
      },
      execute: async ({ city }) => {
        // 模拟天气数据 — 替换为真实天气 API
        const conditions = ["晴", "多云", "雨", "阴"];
        const temps = [15, 20, 22, 25, 28, 30];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const temp = temps[Math.floor(Math.random() * temps.length)];
        return `${city}: ${temp}°C, ${condition}`;
      },
    }),

    get_time: tool({
      description: "获取时区的当前时间",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "时区名称（如 'Asia/Shanghai', 'Asia/Tokyo'）",
          },
        },
        required: ["timezone"],
      },
      execute: async ({ timezone }) => {
        try {
          const now = new Date();
          const time = now.toLocaleTimeString("zh-CN", { timeZone: timezone });
          const date = now.toLocaleDateString("zh-CN", { timeZone: timezone });
          return `${timezone}: ${date} ${time}`;
        } catch {
          return `未知时区: ${timezone}`;
        }
      },
    }),
  },
});
```

---

## 第 4 步：创建聊天端点

```ts
import { toDataStream } from "@halo-ai/stream";

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages 必须是一个数组" });
    }

    // 使用 sdkStream 生成 AI SDK 兼容的流式响应
    const response = toDataStream(agent.sdkStream(messages));

    // 以 SSE 格式转发
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    const reader = response.body?.getReader();
    if (!reader) {
      res.end();
      return;
    }

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
  } catch (err) {
    console.error("聊天错误:", err);
    res.status(500).json({ error: "内部服务器错误" });
  }
});
```

---

## 第 5 步：添加统计端点

```ts
app.get("/api/stats", (req, res) => {
  res.json({
    turns: agent.stats.turns,
    cache: {
      hitRate: agent.stats.caching?.cacheHitRate ?? 0,
      totalHitTokens: agent.stats.caching?.totalCacheHitTokens ?? 0,
      totalMissTokens: agent.stats.caching?.totalCacheMissTokens ?? 0,
      estimatedSavingsUsd: agent.stats.caching?.estimatedSavingsUsd ?? 0,
    },
  });
});
```

---

## 第 6 步：启动服务器

```ts
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🤖 Halo 聊天机器人运行在 http://localhost:${PORT}`);
  console.log(`   POST /api/chat  — 发送 { messages: [...] }`);
  console.log(`   GET  /api/stats — 查看缓存统计`);
});
```

---

## 第 7 步：运行与测试

```bash
tsx src/server.ts
```

用 curl 测试：

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "北京现在天气怎么样？"}
    ]
  }'
```

查看缓存统计：

```bash
curl http://localhost:3000/api/stats
```

---

## 总结

你已经构建了一个完整的聊天机器人，包含：

- ✅ 带缓存优化的多轮对话
- ✅ 天气和时间查询工具调用
- ✅ SSE 流式响应
- ✅ 缓存统计监控
- ✅ 简单的 Web 前端（可选，代码请参考英文版）

## 下一步

- [部署到生产环境](/zh/guides/deploying)
- [添加自定义工具调用](/zh/guides/tool-calling)
- [探索提供商选项](/zh/getting-started/choosing-a-provider)
