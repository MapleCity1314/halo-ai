# @halo-sdk/adapters

Model adapters for Halo AI SDK — provider-specific implementations of the `ModelAdapter` interface.

## Installation

```bash
npm install @halo-sdk/adapters
```

Requires `@halo-sdk/core` as a peer dependency.

## DeepSeek Adapter

```ts
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { Halo } from "@halo-sdk/core";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-v4-pro", // optional, defaults to deepseek-v4-flash
    baseUrl: "https://api.deepseek.com", // optional, for proxies or self-hosted
  }),
});
```

### Prefix Caching

DeepSeek automatically caches the stable prefix (system prompt + tools + few-shots). The adapter tracks cache hits and reports them via `agent.stats.caching`:

```ts
console.log(agent.stats.caching);
// → { totalCacheHitTokens, totalCacheMissTokens, cacheHitRate, estimatedSavingsUsd }
```

### Keep-Alive

Server-side KV cache expires after ~5 minutes. Use `agent.keepAlive()` to maintain it:

```ts
const { stop } = agent.keepAlive(120_000); // ping every 2 min
// ... long task ...
stop();
```

## Custom Adapter

Implement `ModelAdapter` to support any LLM provider:

```ts
import type { ModelAdapter, ModelCapabilities, ChatParams } from "@halo-sdk/core";

class MyAdapter implements ModelAdapter {
  readonly modelId = "my-model";
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = { toolUse: true, streaming: true };

  async chat(params: ChatParams) {
    const messages = [...params.prefix, ...params.history];
    // Call your provider's API...
    return { content, toolCalls, usage };
  }

  async *stream(params: ChatParams): AsyncGenerator<TurnChunk> {
    // Yield { type: "text-delta", delta } | { type: "tool-call-ready", ... } | { type: "done", usage }
  }
}
```

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/en/api-reference/deepseek-adapter) for full API reference.
