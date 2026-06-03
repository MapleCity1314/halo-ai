# `DeepSeekAdapter`

Built-in adapter for the DeepSeek API. Supports prefix caching, tool use, and streaming.

## Import

```ts
import { DeepSeekAdapter } from "@halo-ai/adapters";
```

## Constructor

```ts
new DeepSeekAdapter(opts: {
  apiKey: string;
  model?: string;       // default: "deepseek-v4-flash"
  baseUrl?: string;     // default: "https://api.deepseek.com"
})
```

## Properties

| Property | Value | Description |
|---|---|---|
| `modelId` | `"deepseek-v4-flash"` | Default model |
| `contextWindow` | `128_000` | Token limit |
| `capabilities.toolUse` | `true` | Tool calling supported |
| `capabilities.streaming` | `true` | Streaming supported |
| `pricing.inputPricePer1k` | `0.00027` | $/1K input tokens |
| `pricing.cachedInputPricePer1k` | `0.00007` | $/1K cached input tokens |

## Caching

DeepSeek automatically caches the prefix (position 0 in the message array). The adapter sends messages as `[...prefix, ...history]`, placing the stable prefix first for automatic cache detection.
