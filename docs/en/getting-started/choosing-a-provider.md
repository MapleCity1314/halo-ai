# Choosing a Provider

Halo separates provider-specific logic into **adapters**. Choose the adapter that matches your provider.

## Built-in Adapter

| Adapter | Provider | Caching | Install |
|---|---|---|---|
| `DeepSeekAdapter` | DeepSeek | Position-0 prefix | `@halo-ai/adapters` |

## Creating Custom Adapters

For providers without a built-in adapter, implement the `ModelAdapter` interface:

```ts
import type { ModelAdapter, ChatMessage, ToolSpec, Usage } from "@halo-ai/core";

class OpenAiAdapter implements ModelAdapter {
  readonly modelId = "gpt-4o";
  readonly contextWindow = 128_000;
  readonly capabilities = { toolUse: true, streaming: true };
  readonly pricing = { inputPricePer1k: 0.005, cachedInputPricePer1k: 0.0025 };

  constructor(private apiKey: string) {}

  async chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.modelId, messages: [...prefix, ...history], tools }),
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
    // ... SSE streaming implementation
  }
}
```

::: tip Cache-First
The `chat()` method receives `prefix` and `history` separately. For most providers, just concatenate them: `[...prefix, ...history]`. For Anthropic, add `cache_control` markers to prefix messages. For Gemini, create a `CachedContent` resource.
:::

## Provider Capabilities

| Provider | Prefix Caching | Tool Use | Streaming |
|---|---|---|---|
| DeepSeek | ✅ Position-0 | ✅ | ✅ |
| OpenAI | ✅ Automatic | ✅ | ✅ |
| Anthropic | ✅ cache_control | ✅ | ✅ |
| Gemini | ✅ CachedContent | ✅ | ✅ |
| Kimi | ✅ (if supported) | ✅ | ✅ |
| GLM | ✅ (if supported) | ✅ | ✅ |
