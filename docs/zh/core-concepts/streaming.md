# 流式输出

Halo 通过 `agent.stream()` 支持流式输出，通过 `toDataStream()` 提供 SSE 协议转换。

## 基本流式输出

```ts
const stream = agent.stream("给我讲个故事。");
for await (const chunk of stream) {
  switch (chunk.type) {
    case "text-delta": process.stdout.write(chunk.delta); break;
    case "tool-call-ready": console.log("工具调用:", chunk.call); break;
    case "done": console.log("用量:", chunk.usage); break;
  }
}
```

## TurnChunk 类型

| 类型 | 字段 | 描述 |
|---|---|---|
| `text-delta` | `delta: string` | 文字片段 |
| `tool-call-delta` | `index, name?, argumentsDelta?` | 增量工具调用数据 |
| `tool-call-ready` | `index, call: ToolCall` | 完整的工具调用 |
| `done` | `usage: Usage` | 流结束，附带用量统计 |

## 与 toDataStream 配合

```ts
import { toDataStream } from "@halo-ai/stream";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = halo.agent({ system: "...", tools: { ... } });
  return toDataStream(agent.sdkStream(messages));
}
```

`toDataStream()` 将 `TurnChunk` 转换为 Vercel AI SDK 的 SSE 协议：

```
0:"你好"           ← text-delta
9:[{...}]           ← tool-call-delta
d:{"usage":{...}}   ← done
```

::: warning 缓存说明
流式输出使用与 `chat()` 相同的前缀/历史分离。前缀 token 仍然被缓存。
:::
