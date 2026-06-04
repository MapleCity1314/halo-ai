# `ContextStrategy` + `TruncateStrategy`

上下文窗口管理的接口与内置实现。

## 接口

```ts
interface ContextStrategy {
  prepare(
    prefix: ChatMessage[],    // 只读 — 请勿修改
    history: ChatMessage[],   // 可截断/归纳
    ctxMax: number,           // 模型的上下文窗口大小
  ): {
    history: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  };
}
```

## TruncateStrategy

```ts
import { TruncateStrategy } from "@halo-ai/strategies";

new TruncateStrategy(opts?: { maxTokens?: number })
// 默认 maxTokens: 102_400 (128K 的 80%)
```

保留最近适配 token 预算的消息。Prefix 不受影响。

## 使用

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  context: new TruncateStrategy({ maxTokens: 50_000 }),
});
```

## 自定义策略

实现 `ContextStrategy` 接口：

```ts
class MyStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    // 切勿修改 prefix — 否则会破坏缓存！
    return { history, modified: false, droppedCount: 0 };
  }
}
```
