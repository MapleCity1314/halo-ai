# Multi-Provider Setup

Halo's adapter architecture lets you switch providers by changing one line of code. The agent API stays identical.

## Switching Providers

```ts
// DeepSeek
const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

// Switch to OpenAI (custom adapter)
const halo = new Halo({
  adapter: new OpenAiAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
});

// Switch to Anthropic (custom adapter)
const halo = new Halo({
  adapter: new AnthropicAdapter({ apiKey: process.env.ANTHROPIC_API_KEY! }),
});

// Agent usage is identical
const agent = halo.agent({ system: "...", tools: { ... } });
const result = await agent.run("Hello!");
```

## Multiple Agents with Different Providers

```ts
const deepseekHalo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});
const openaiHalo = new Halo({
  adapter: new OpenAiAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
});

const researcher = deepseekHalo.agent({
  system: "You are a researcher. Use web_search to find information.",
  tools: { web_search: tool({ ... }) },
});

const writer = openaiHalo.agent({
  system: "You are a writer. Write clear, engaging content.",
});

// Orchestrate multiple agents
const facts = await researcher.run("Latest AI trends");
const article = await writer.run(`Write an article based on: ${facts.content}`);
```

## Provider-Specific Configuration

```ts
const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-v4-pro",       // Specific model variant
    baseUrl: "https://api.deepseek.com", // Custom endpoint
  }),
});
```

## Cost Comparison

Each adapter exposes its pricing for automatic savings tracking:

```ts
const agent = halo.agent({ system: "..." });
await agent.run("...");
console.log(agent.stats.caching?.estimatedSavingsUsd);
// DeepSeek:  ~74% savings on cached tokens
// OpenAI:    ~50% savings (automatic caching)
// Anthropic: varies (cache write fee + read discount)
```

## Environment-Based Provider Selection

```ts
function createHalo() {
  const provider = process.env.LLM_PROVIDER ?? "deepseek";

  switch (provider) {
    case "deepseek":
      return new Halo({
        adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
      });
    case "openai":
      return new Halo({
        adapter: new OpenAiAdapter({ apiKey: process.env.OPENAI_API_KEY! }),
      });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}
```
