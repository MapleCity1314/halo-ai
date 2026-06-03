# Building an Agent

A step-by-step guide to building a complete AI agent with Halo.

## 1. Setup

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});
```

## 2. Define Tools

```ts
const agent = halo.agent({
  system: "You are a research assistant. Use tools to answer questions accurately.",
  tools: {
    search_web: tool({
      description: "Search the web for information",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
        },
        required: ["query"],
      },
      execute: async ({ query }) => {
        const results = await fetch(`https://api.search.com?q=${query}`);
        return JSON.stringify(await results.json());
      },
    }),
    calculate: tool({
      description: "Perform a calculation",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression" },
        },
        required: ["expression"],
      },
      execute: async ({ expression }) => {
        return String(eval(expression)); // Safe in controlled environments
      },
    }),
  },
});
```

## 3. Run the Agent

```ts
const result = await agent.run(
  "What is the population of Tokyo divided by the population of Paris?"
);

console.log(result.content);
// "Tokyo has ~14 million people, Paris has ~2.1 million.
//  14,000,000 / 2,100,000 ≈ 6.67"
```

## 4. Check Stats

```ts
console.log(`Turns: ${agent.stats.turns}`);
console.log(`Cache hit rate: ${(agent.stats.caching?.cacheHitRate ?? 0) * 100}%`);
console.log(`Estimated savings: $${agent.stats.caching?.estimatedSavingsUsd}`);

// Turns: 3 (initial + 2 tool calls)
// Cache hit rate: 85%
// Estimated savings: $0.0023
```

## 5. Handle Errors

```ts
const agent = halo.agent({
  system: "...",
  tools: { ... },
  on: (event, payload) => {
    switch (event) {
      case "cache:miss":
        console.warn("Cache miss:", payload);
        break;
      case "context:truncated":
        console.warn("Context truncated:", payload);
        break;
      case "repair:applied":
        console.warn("Tool call repaired:", payload);
        break;
    }
  },
});
```
