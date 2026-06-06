# Next.js 聊天示例

一个使用 Halo + DeepSeek + Next.js App Router 的完整聊天应用 — **模块化 agent/tool/route 架构**。

> 📂 源码: [`examples/next-halo/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/next-halo)

## 核心特性

- **模块化设计**: Agent、Tool、Route 分离 — 工具可在多个 agent 间复用
- **Cache-First 流式**: system prompt + tool 规格通过 `StablePrefix` 缓存
- **工具自动执行**: `streamText` 带完整工具调用循环
- **useChat 集成**: 通过 `toDataStream()` 兼容 Vercel AI SDK

## 项目结构

```
examples/next-halo/
  agent/
    weather-agent.ts     # Halo 工厂 + agent 定义
  tool/
    weather-tool.ts      # 天气工具（类型化 spec + execute）
  app/api/chat/
    route.ts             # 薄路由 — 解析、streamText、toDataStream
```

## 工具

```ts
// tool/weather-tool.ts
import { tool } from "@halo-sdk/core";

export const weatherTool = tool<{ city: string }>({
  description: "获取城市天气",
  parameters: {
    type: "object",
    properties: { city: { type: "string" } },
    required: ["city"],
  },
  execute: async ({ city }) => {
    const data: Record<string, string> = {
      beijing: "5°C, 晴天",
      tokyo: "8°C, 小雨",
      paris: "11°C, 多云",
    };
    return data[city.toLowerCase()] ?? `${city}: 20°C, 晴天`;
  },
});
```

## Agent

```ts
// agent/weather-agent.ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { weatherTool } from "@/tool/weather-tool";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export function createWeatherAgent() {
  return halo.agent({
    messages: [{ role: "system", content: "你是一个天气助手。" }],
    tools: { get_weather: weatherTool },
  });
}
```

## 路由 — streamText（推荐 API）

```ts
// app/api/chat/route.ts
import { createWeatherAgent } from "@/agent/weather-agent";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = createWeatherAgent();
  return agent.streamText(messages, { maxSteps: 10 }).toDataStream();
}
```

## 快速启动

```bash
cd examples/next-halo
cp .env.local.example .env.local   # 添加 DEEPSEEK_API_KEY
pnpm install
pnpm dev
```

打开 `http://localhost:3000`，试着询问天气。
