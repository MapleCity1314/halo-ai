# 选择提供商

Halo 将提供商特定逻辑分离到**适配器**中。

## 内置适配器

| 适配器 | 提供商 | 缓存 | 安装 |
|---|---|---|---|
| `DeepSeekAdapter` | DeepSeek | Position-0 前缀 | `@halo-ai/adapters` |

## 创建自定义适配器

对于没有内置适配器的提供商，实现 `ModelAdapter` 接口：

```ts
class OpenAiAdapter implements ModelAdapter {
  readonly modelId = "gpt-4o";
  readonly contextWindow = 128_000;
  readonly capabilities = { toolUse: true, streaming: true };
  readonly pricing = { inputPricePer1k: 0.005, cachedInputPricePer1k: 0.0025 };

  constructor(private apiKey: string) {}

  async chat(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    const messages = [...prefix, ...history];
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.modelId, messages, tools }),
    });
    const data = await resp.json();
    return {
      content: data.choices[0].message.content ?? "",
      toolCalls: data.choices[0].message.tool_calls ?? [],
      usage: { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens },
    };
  }

  async *stream(prefix: ChatMessage[], history: ChatMessage[], tools?: ToolSpec[]) {
    // SSE 流式实现
  }
}
```
