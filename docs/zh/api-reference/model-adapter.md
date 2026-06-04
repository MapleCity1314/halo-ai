# `ModelAdapter`

Halo 与任意模型提供商之间的接口。

## 导入

```ts
import type { ModelAdapter, ModelCapabilities, PricingInfo } from "@halo-ai/core";
```

## 接口

```ts
interface ModelAdapter {
  chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]): Promise<{
    content: string;
    toolCalls: ToolCall[];
    usage: Usage;
  }>;

  stream(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk>;

  readonly modelId: string;
  readonly contextWindow: number;
  readonly capabilities: ModelCapabilities;
  readonly pricing?: PricingInfo;
  keepAlive?(prefix: ChatMessage[]): { stop: () => void };
}
```

## ModelCapabilities

```ts
interface ModelCapabilities {
  toolUse: boolean;
  streaming: boolean;
}
```

## PricingInfo

```ts
interface PricingInfo {
  inputPricePer1k: number;
  cachedInputPricePer1k: number;
}
```

## 关键设计

- **prefix 与 history 分离**：适配器接收分离的 prefix 和 history，有助于正确排列 message 顺序并利用缓存
- **只读 prefix**：适配器不应修改 prefix——将其置于 position 0 即可自动缓存
- **可选的 `keepAlive`**：对于支持缓存 TTL 的提供商，实现此方法以保持前缀缓存热度
