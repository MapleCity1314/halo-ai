# 故障排除

## 缓存命中率低或为零

**可能原因：** 请求间系统提示词变化 / 工具增删 / 使用不支持缓存的提供商

**解决：** 保持系统提示词和工具定义稳定。用 `clearLog()` 而不是创建新 Agent。

## `agent.stats.caching` 为 `undefined`

适配器未暴露 `pricing`。为适配器添加定价信息。

## 类型错误：`ToolDefinition<{ city: string }>` 不兼容

```ts
const agent = halo.agent({
  tools: {
    my_tool: tool({
      execute: async (args: Record<string, unknown>) => { ... },
    }),
  },
});
```

## useChat 中看不到流式进度

确保使用 `toDataStream()` 包装流。原始的 `agent.stream()` 返回 `TurnChunk` 格式——`toDataStream()` 转换为 `useChat` 期望的 SSE 协议。

## 上下文窗口溢出

```ts
import { TruncateStrategy } from "@halo-ai/strategies";
const agent = halo.agent({ context: new TruncateStrategy({ maxTokens: 100_000 }) });
```

## 工具在 agent.run() 中不执行

确保包含 `execute` 函数或传递 `onToolCall` 回调。两者都没有时，`run()` 返回工具调用但不执行。
