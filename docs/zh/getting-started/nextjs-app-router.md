# Next.js App Router

用 Next.js App Router、Halo 和 Vercel AI SDK 的 `useChat` hook 构建聊天应用。

## 安装

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream @ai-sdk/react
```

## API 路由

创建 `app/api/chat/route.ts`：

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    system: "你是一个有用的助手。",
    tools: {
      get_weather: tool({
        description: "获取城市天气",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }) => `${city}: 22°C, 晴天`,
      }),
    },
  });

  return toDataStream(agent.sdkStream(messages));
}
```

## 聊天组件

```tsx
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();
  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={status !== "ready"} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```

## 工作原理

1. `useChat` 每次提交向 `/api/chat` 发送全部消息
2. `agent.sdkStream(messages)` 转换 UIMessages、恢复历史并流式输出
3. `toDataStream()` 将流包装为 Vercel AI SDK 的 SSE 协议
4. `useChat` 自动解析 SSE 流并更新 UI

::: tip 缓存优先
系统提示词和工具定义是**稳定前缀**的一部分。DeepSeek 自动缓存它们。请求之间只有对话轮次变化——前缀 token 以约 74% 折扣计费。
:::
