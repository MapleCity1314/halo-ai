# @halo-sdk/core

Core types, factory, and session management for the Halo AI SDK — a cache-first agent framework with automatic prefix caching.

## Installation

```bash
npm install @halo-sdk/core
```

Requires Node.js >= 22 and a compatible model adapter (e.g. `@halo-sdk/adapters`).

## Quick Start

```ts
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You are a helpful assistant." }],
  tools: {
    weather: tool({
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `Sunny, 22°C in ${city}`,
    }),
  },
});

const result = await agent.generateText("What's the weather in Paris?");
console.log(result.content);
// → "The weather in Paris is sunny, 22°C."
```

## Key Features

- **Cache-first architecture** — `StablePrefix` (system prompt + tools + few-shots) is automatically cached by DeepSeek. Only dynamic conversation history is billed at full rate.
- **Auto tool loop** — tools with `execute` are automatically called by `generateText()`.
- **Streaming** — `streamText()` with full tool-loop support, compatible with Vercel AI SDK `useChat`.
- **Structured output** — `generateObject()` with Zod or JSON Schema.
- **Agent Skills** — progressive disclosure via `discoverSkills()` + auto-registered `loadSkill` tool.

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/en/api-reference/halo-agent) for full API reference and guides.
