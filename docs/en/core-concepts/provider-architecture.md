# Provider Architecture

Halo's `ModelAdapter` interface is the bridge between the framework and any model provider. This page explains how to implement custom adapters.

## The Interface

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

## Key Design Decisions

### 1. Split prefix/history â€?not flat messages

Adapters receive prefix and history **separately**. This lets each adapter apply its own caching strategy:

```ts
// DeepSeek: prefix at position 0 = auto-cached
const messages = [...prefix, ...history];

// Anthropic: mark prefix messages for caching
const messages = [
  ...prefix.map(m => ({ ...m, cache_control: { type: "ephemeral" } })),
  ...history
];

// Gemini: create CachedContent from prefix, reference in request
const cacheName = await createCache(prefix);
const body = { cachedContent: cacheName, contents: history };
```

### 2. Capabilities â€?not provider detection

Instead of `if (provider === "deepseek")`, use capability flags:

```ts
interface ModelCapabilities {
  toolUse: boolean;
  streaming: boolean;
}
```

The framework checks capabilities, not provider names.

### 3. Pricing optional

If the adapter exposes `pricing`, the framework tracks estimated savings:

```ts
readonly pricing: PricingInfo = {
  inputPricePer1k: 0.00027,
  cachedInputPricePer1k: 0.00007,
};
```

Without pricing, savings are `null`.

## Writing a Custom Adapter

See [Choosing a Provider](/en/getting-started/choosing-a-provider#creating-custom-adapters) for a complete example (~30 lines).

The minimal implementation:

```ts
class MyAdapter implements ModelAdapter {
  readonly modelId = "my-model";
  readonly contextWindow = 128_000;
  readonly capabilities = { toolUse: true, streaming: true };

  async chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    const messages = [...prefix, ...history];
    const resp = await fetch("https://api.example.com/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.modelId, messages, tools }),
    });
    const data = await resp.json();
    return {
      content: data.choices[0].message.content ?? "",
      toolCalls: data.choices[0].message.tool_calls ?? [],
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
      },
    };
  }

  async *stream(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    // SSE implementation for your provider
  }
}
```

