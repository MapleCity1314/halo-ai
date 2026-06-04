# 上下文管理

当对话增长超出模型的上下文窗口时，你需要一个策略。Halo 通过 `ContextStrategy` 提供此能力。

## 问题场景

```ts
const agent = halo.agent({ system: "..." });

// 200 轮后，对话超出 128K token 限制
// API 调用会失败，或模型丢失早期上下文
for (let i = 0; i < 200; i++) {
  await agent.send(`Message ${i}`);
}
```

## 使用 TruncateStrategy

```ts
import { TruncateStrategy } from "@halo-ai/strategies";

const agent = halo.agent({
  system: "You are a helpful assistant.",
  context: new TruncateStrategy({ maxTokens: 100_000 }), // 100K token 预算
});
```

`TruncateStrategy` 保留 prefix（system + tools）不变，仅截断对话历史。它保留最近的消息，丢弃最旧的消息。

## 工作原理

策略**分别**接收完整的 prefix 和 history。Prefix 是只读的——策略不能修改它（否则会破坏缓存）。只有 history 会被截断：

```
截断前:
  prefix: [system, ...fewShots]           ← 不修改
  history: [msg1, msg2, ..., msg200]      ← 过大

截断后:
  prefix: [system, ...fewShots]           ← 仍不变，缓存保留
  history: [msg180, msg181, ..., msg200]  ← 截断以适配预算
```

## 自定义策略

```ts
import type { ContextStrategy, ChatMessage } from "@halo-ai/core";

class SummarizeStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    // prefix 是只读的 — 切勿修改！

    if (history.length < 50) {
      return { history, modified: false, droppedCount: 0 };
    }

    // 将旧消息归纳为一条类似 system 的消息
    const oldMessages = history.slice(0, -20);
    const recentMessages = history.slice(-20);

    const summary = `[Earlier conversation summary: ${oldMessages.length} messages about ${extractTopics(oldMessages)}]`;

    return {
      history: [
        { role: "system", content: summary },
        ...recentMessages,
      ],
      modified: true,
      summary,
      droppedCount: oldMessages.length,
    };
  }
}
```

## 监控截断事件

```ts
const agent = halo.agent({
  system: "...",
  context: new TruncateStrategy(),
  on: (event, payload) => {
    if (event === "context:truncated") {
      console.log(`已丢弃 ${payload.droppedCount} 条消息`);
    }
  },
});
```
