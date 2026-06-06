# Node.js CLI Agent

An interactive command-line agent with **cache-first** tool calling, keep-alive, and live stats.

> 📂 Source: [`examples/nodejs-cli/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/nodejs-cli)

## Key Features

- **Cache-first**: Single agent instance — `StablePrefix` cached across all turns
- **Tool auto-execute**: `get_time`, `read_file`, `calculator` run automatically via `generateText`
- **Keep-alive**: Prevents DeepSeek KV-cache expiry (~5 min default) during long sessions
- **Stats**: Type `/stats` to see cache hit rate, token usage, cost savings

## Code (abbreviated)

```ts
import "dotenv/config";
import * as readline from "node:readline";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  messages: [
    { role: "system", content: "You are a helpful CLI assistant. Keep responses concise." },
  ],
  tools: {
    get_time: tool({ /* ... */ execute: async () => new Date().toISOString() }),
    read_file: tool({ /* ... */ execute: async ({ path }) => await fs.readFile(path, "utf-8") }),
    calculator: tool({ /* ... */ execute: async ({ expression }) => String(eval(expression)) }),
  },
  model: { temperature: 0.7 },
});

// Keep-alive — ping every 2 min to maintain server-side KV cache
const { stop } = agent.keepAlive(120_000);

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

while (true) {
  const input = await ask("> ");
  if (input === "/stats") {
    const s = agent.stats;
    console.log(`Hit rate: ${(s.caching?.cacheHitRate ?? 0) * 100}% | Turns: ${s.turns}`);
    continue;
  }
  if (input === "exit") break;

  // generateText — full tool auto-execute loop
  const result = await agent.generateText(input, { maxSteps: 8 });
  console.log(result.content);
}

stop(); // clean up keep-alive
```

## Running

```bash
cd examples/nodejs-cli
cp .env.example .env
pnpm install && pnpm dev
```

## Example session

```
> What time is it?
🤖 The current time is 2026-03-17T14:30:00.000Z.

> /stats
  Turns: 1 | Hit rate: 71.8%

> exit
Session: 1 turns, cache hit rate: 71.8%
```
