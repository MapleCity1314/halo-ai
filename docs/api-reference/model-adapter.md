# `ModelAdapter`

The interface between Halo and any model provider.

## Import

```ts
import type { ModelAdapter, ModelCapabilities, PricingInfo } from "@halo-ai/core";
```

## Interface

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
