# 自定义适配器

用约 40 行代码为任意模型提供商构建适配器。

## 接口定义

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

## 分步教程：OpenAI 适配器

### 1. 导入与构造函数

```ts
import type { ChatMessage, ToolCall, ToolSpec, Usage, TurnChunk, ModelAdapter, ModelCapabilities, PricingInfo } from "@halo-ai/core";

export class OpenAiAdapter implements ModelAdapter {
  readonly modelId: string;
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = { toolUse: true, streaming: true };
  readonly pricing: PricingInfo = { inputPricePer1k: 0.005, cachedInputPricePer1k: 0.0025 };

  constructor(private apiKey: string, model = "gpt-4o") {
    this.modelId = model;
  }
```

### 2. chat() 方法

```ts
  async chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    // Cache-First: prefix 位于 position 0，自动缓存
    const messages = [...prefix, ...history];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        tools: tools?.length ? tools : undefined,
        stream: false,
      }),
    });

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}: ${await resp.text()}`);

    const data = await resp.json();
    const choice = data.choices?.[0]?.message;

    return {
      content: choice?.content ?? "",
      toolCalls: (choice?.tool_calls ?? []).map((tc: any) => ({
        id: tc.id,
        type: "function" as const,
        function: tc.function,
      })),
      usage: {
        promptTokens: data.usage?.prompt_tokens ?? 0,
        completionTokens: data.usage?.completion_tokens ?? 0,
        caching: data.usage?.prompt_tokens_details?.cached_tokens ? {
          hitTokens: data.usage.prompt_tokens_details.cached_tokens,
          missTokens: data.usage.prompt_tokens - data.usage.prompt_tokens_details.cached_tokens,
          hitRate: data.usage.prompt_tokens_details.cached_tokens / data.usage.prompt_tokens,
        } : undefined,
      },
    };
  }
```

### 3. stream() 方法

```ts
  async *stream(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    const messages = [...prefix, ...history];

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify({
        model: this.modelId,
        messages,
        tools: tools?.length ? tools : undefined,
        stream: true,
        stream_options: { include_usage: true },
      }),
    });

    const reader = resp.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6);
        if (data === "[DONE]") { yield { type: "done", usage: { promptTokens: 0, completionTokens: 0 } }; return; }
        try {
          const json = JSON.parse(data);
          const delta = json.choices?.[0]?.delta;
          if (delta?.content) yield { type: "text-delta", delta: delta.content };
          // ... 处理 tool_calls delta
          if (json.usage) yield { type: "done", usage: { promptTokens: json.usage.prompt_tokens, completionTokens: json.usage.completion_tokens } };
        } catch { /* skip */ }
      }
    }
  }
}
```

## Anthropic 适配器（缓存标记）

对于 Anthropic，需要向 prefix 消息添加 `cache_control` 标记：

```ts
async chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
  const messages = [
    ...prefix.map(m => ({ ...m, cache_control: { type: "ephemeral" as const } })),
    ...history,
  ];
  // ... 调用 Anthropic API
}
```

## 注册

```ts
const halo = new Halo({ adapter: new OpenAiAdapter(process.env.OPENAI_API_KEY!) });
const agent = halo.agent({ system: "...", tools: { ... } });
// 一切照常工作 — 缓存追踪、agent 循环、流式输出
```
