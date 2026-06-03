# 提供商架构

`ModelAdapter` 接口是框架与任何模型提供商之间的桥梁。

## 接口

```ts
interface ModelAdapter {
  chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]): Promise<{...}>;
  stream(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk>;
  readonly modelId: string;
  readonly contextWindow: number;
  readonly capabilities: ModelCapabilities;
  readonly pricing?: PricingInfo;
  keepAlive?(prefix: ChatMessage[]): { stop: () => void };
}
```

## 关键设计决策

### 分离 prefix/history

适配器分别接收前缀和历史。让每个适配器应用自己的缓存策略：

```ts
// DeepSeek: position 0 = 自动缓存
const messages = [...prefix, ...history];

// Anthropic: 标记前缀消息用于缓存
const messages = [
  ...prefix.map(m => ({ ...m, cache_control: { type: "ephemeral" } })),
  ...history
];

// Gemini: 从前缀创建 CachedContent
const cacheName = await createCache(prefix);
const body = { cachedContent: cacheName, contents: history };
```

### 能力标记而非提供商检测

```ts
interface ModelCapabilities {
  toolUse: boolean;
  streaming: boolean;
}
```

框架检查能力，而非提供商名称。

### 定价可选

如果适配器暴露 `pricing`，框架追踪预估节省。没有定价，节省为 `null`。
