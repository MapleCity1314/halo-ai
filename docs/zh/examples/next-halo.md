# Next.js 聊天示例

一个完整的聊天应用，使用 Halo、DeepSeek 和 Next.js App Router。

## 快速启动

```bash
cd examples/next-halo
cp .env.local.example .env.local   # 添加 DEEPSEEK_API_KEY
pnpm install
pnpm dev
```

打开 `http://localhost:3000`，试着询问天气。

## API 路由

```ts
// app/api/chat/route.ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = halo.agent({
    system: "你是一个天气助手。",
    tools: {
      get_weather: tool({
        description: "获取城市天气",
        execute: async ({ city }) => {
          const data: Record<string, string> = {
            beijing: "5°C, 晴天", paris: "11°C, 多云", tokyo: "8°C, 小雨",
          };
          return data[city.toLowerCase()] ?? `${city}: 20°C, 晴天`;
        },
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
      {messages.map((m) => <div key={m.id}>{m.content}</div>)}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={status !== "ready"} />
        <button type="submit">发送</button>
      </form>
    </div>
  );
}
```
