# `toDataStream` + `createHaloStream`

SSE 协议转换和自定义流式输出的工具。

## `toDataStream(source)`

包装 `AsyncGenerator<TurnChunk>` 为 SSE `Response`。兼容 Vercel AI SDK 的 `useChat`。

```ts
import { toDataStream } from "@halo-ai/stream";

// 在 Next.js API 路由中
return toDataStream(agent.sdkStream(messages));
```

### SSE 协议

| TurnChunk | SSE 输出 |
|---|---|
| `text-delta` | `0:"<delta>"` |
| `tool-call-delta` | `9:[<chunk>]` |
| `done` | `d:{"usage":{...}}` |

## `createHaloStream(fn)`

不走 `HaloAgent` 的自定义流入口。

```ts
import { createHaloStream } from "@halo-ai/stream";

const stream = createHaloStream(async (ctrl) => {
  ctrl.writeText("处理中... ");
  await someAsyncWork();
  ctrl.writeText("完成！");
  ctrl.close({ promptTokens: 10, completionTokens: 5 });
});
```
