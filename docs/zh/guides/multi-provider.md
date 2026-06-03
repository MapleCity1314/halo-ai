# 多提供商设置

## 切换提供商

```ts
// DeepSeek
const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });

// OpenAI（自定义适配器）
const halo = new Halo({ adapter: new OpenAiAdapter({ apiKey }) });

// Agent 用法完全相同
const agent = halo.agent({ system: "...", tools: { ... } });
```

## 多 Agent 多提供商

```ts
const researcher = deepseekHalo.agent({ system: "你是研究员。", tools: { search: tool({...}) } });
const writer = openaiHalo.agent({ system: "你是写作者。" });

const facts = await researcher.run("最新的 AI 趋势");
const article = await writer.run(`基于此写一篇文章: ${facts.content}`);
```

## 基于环境的提供商选择

```ts
function createHalo() {
  const provider = process.env.LLM_PROVIDER ?? "deepseek";
  switch (provider) {
    case "deepseek": return new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });
    case "openai": return new Halo({ adapter: new OpenAiAdapter({ apiKey }) });
    default: throw new Error(`未知提供商: ${provider}`);
  }
}
```
