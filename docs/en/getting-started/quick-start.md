# Quick Start

Get a Halo agent running in 5 minutes.

## 1. Install

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

## 2. Set API Key

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. Create Your First Agent

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

const agent = halo.agent({
  system: "You are a helpful assistant.",
});

const result = await agent.send("Hello! How are you?");
console.log(result.content);
// "Hello! I'm doing well, thank you for asking. How can I help you today?"
```

## 4. Add a Tool

```ts
import { Halo, tool } from "@halo-ai/core";

const agent = halo.agent({
  system: "You are a calculator. Use the calculate tool for math.",
  tools: {
    calculate: tool({
      description: "Evaluate a math expression",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression" },
        },
        required: ["expression"],
      },
      execute: async ({ expression }) => {
        // Safe: only allow numbers and basic operators
        if (!/^[\d\s+\-*/().]+$/.test(expression)) {
          return "Error: invalid expression";
        }
        return String(Function(`"use strict"; return (${expression})`)());
      },
    }),
  },
});

const result = await agent.run("What is (42 * 58) + (17 * 23)?");
console.log(result.content);
// "(42 × 58) + (17 × 23) = 2436 + 391 = 2827"
```

## 5. Check Your Savings

```ts
console.log(`Cache hit rate: ${((agent.stats.caching?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
console.log(`Estimated savings: $${(agent.stats.caching?.estimatedSavingsUsd ?? 0).toFixed(4)}`);
```

## Next Steps

- [Build a complete Agent](/en/guides/building-an-agent)
- [Add streaming to your Next.js app](/en/getting-started/nextjs-app-router)
- [Explore the architecture](/en/introduction/architecture)
