# 错误处理

## Agent 事件

```ts
const agent = halo.agent({
  system: "...",
  on: (event, payload) => {
    switch (event) {
      case "cache:miss": console.warn("缓存未命中:", payload); break;
      case "context:truncated": console.warn("上下文截断:", payload.droppedCount); break;
      case "repair:applied": console.warn("工具调用修复:", payload.notes); break;
    }
  },
});
```

| 事件 | 触发时机 |
|---|---|
| `cache:miss` | 检测到缓存未命中 token（第1轮之后） |
| `context:truncated` | ContextStrategy 截断了历史 |
| `repair:applied` | RepairStrategy 修改了工具调用 |

## 常见问题

### 上下文窗口溢出

```ts
import { TruncateStrategy } from "@halo-ai/strategies";
const agent = halo.agent({ context: new TruncateStrategy({ maxTokens: 100_000 }) });
```

### 格式错误的工具调用

```ts
import { BasicRepair } from "@halo-ai/strategies";
const agent = halo.agent({ repair: new BasicRepair() });
```

### 网络错误

```ts
try {
  const result = await agent.run("...");
} catch (err) {
  // 处理 429 / 500 / 超时
}
```

### 工具结果标记为错误

```ts
await agent.submitToolResult({
  toolCallId: call.id,
  output: "连接 API 超时",
  isError: true,
});
```
