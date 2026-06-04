# Next.js Pages Router

在 Next.js Pages Router 中使用 Halo。

## API 路由

创建 `pages/api/chat.ts`：

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";
import type { NextApiRequest, NextApiResponse } from "next";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = req.body;
  const agent = halo.agent({
    system: "You are a helpful assistant.",
  });

  const response = toDataStream(agent.sdkStream(messages));

  res.writeHead(200, Object.fromEntries(response.headers));

  const reader = response.body?.getReader();
  if (!reader) return res.end();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }

  res.end();
}
```

## 客户端组件

与 App Router 使用相同的 `useChat`：

```tsx
import { useChat } from "@ai-sdk/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>{m.role}: {m.content}</div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} />
      </form>
    </div>
  );
}
```

## 注意事项

- Pages Router 的 API Route 使用 `NextApiRequest` / `NextApiResponse`，需要手动处理流式响应
- `toDataStream` 返回标准的 Web `Response` 对象，需将其 header 和 body 逐块转发
- 客户端代码与 App Router 完全一致，无需修改
