# 部署到生产环境

部署 Halo Agent 的最佳实践。

## 环境变量

永远不要硬编码 API 密钥。使用环境变量：

```bash
# .env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```ts
const adapter = new DeepSeekAdapter({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});
```

## Vercel

```json
// vercel.json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

对于流式响应，确保路由配置为 serverless function（App Router 默认）：

```ts
// app/api/chat/route.ts
export const maxDuration = 60; // 长时间 agent 运行最多 60 秒

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = halo.agent({ system: "...", tools: { ... } });
  return toDataStream(agent.sdkStream(messages));
}
```

## Railway / Fly.io

长运行服务器部署。保持 agent 实例存活：

```ts
// 服务器为所有请求维持一个 agent
const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });
const agent = halo.agent({ system: "...", tools: { ... } });

app.post("/chat", async (req, res) => {
  const { messages } = req.body;
  const response = toDataStream(agent.sdkStream(messages));
  // 流式传输响应...
});

// 保持缓存热度
const keepAlive = agent.keepAlive();
```

## Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod
COPY . .
ENV DEEPSEEK_API_KEY=""
CMD ["node", "server.js"]
```

## 性能建议

### 1. 复用 Agent 实例

```ts
// ✅ 一个 agent，多个请求 — 缓存保持热度
const agent = halo.agent({ system: "...", tools: { ... } });

// ❌ 每个请求新建 agent — 每次都是冷启动
app.post("/chat", (req, res) => {
  const agent = halo.agent({ system: "..." });
});
```

### 2. 设置合理的 maxSteps

```ts
// 防止 agent 循环在生产环境中失控
const result = await agent.run("Complex task", { maxSteps: 5 });
```

### 3. 对长对话使用 TruncateStrategy

```ts
import { TruncateStrategy } from "@halo-ai/strategies";
const agent = halo.agent({ context: new TruncateStrategy({ maxTokens: 100_000 }) });
```

### 4. 在生产环境中监控统计

```ts
// 定期记录统计信息
setInterval(() => {
  console.log({
    turns: agent.stats.turns,
    cacheHitRate: agent.stats.caching?.cacheHitRate,
    savings: agent.stats.caching?.estimatedSavingsUsd,
  });
}, 60_000);
```
