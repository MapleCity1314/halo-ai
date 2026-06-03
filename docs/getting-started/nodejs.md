# Node.js

Use Halo in a Node.js server, CLI script, or background worker.

## Basic Usage

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

// Single turn
const result = await agent.send("Hello!");
console.log(result.content);

// Multi-turn
await agent.send("My name is Alice.");
const reply = await agent.send("What's my name?");
console.log(reply.content); // "Your name is Alice."

// With tools
const toolAgent = halo.agent({
  system: "You are a calculator.",
  tools: {
    add: {
      description: "Add two numbers",
      parameters: {
        type: "object",
        properties: { a: { type: "number" }, b: { type: "number" } },
        required: ["a", "b"],
      },
      execute: async ({ a, b }) => String(a + b),
    },
  },
});

const calcResult = await toolAgent.run("What is 42 + 58?");
console.log(calcResult.content); // "42 + 58 = 100"

// Check cache stats
console.log(agent.stats.caching?.cacheHitRate); // e.g. 0.92
console.log(agent.stats.caching?.estimatedSavingsUsd); // e.g. 0.00024
```

## Streaming in Node.js

```ts
const stream = agent.stream("Tell me a story.");
for await (const chunk of stream) {
  if (chunk.type === "text-delta") {
    process.stdout.write(chunk.delta);
  }
}
```

## Keep-Alive for Long Tasks

```ts
const keepAlive = agent.keepAlive(60_000); // ping every 60s

// ... long running task (up to cache TTL) ...

keepAlive.stop();
```
