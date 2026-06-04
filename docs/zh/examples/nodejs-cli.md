# Node.js CLI Agent

一个带工具调用的命令行 Agent。

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import * as readline from "node:readline";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  system: "You are a helpful CLI assistant. Keep responses concise.",
  tools: {
    get_time: tool({
      description: "Get the current time",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => new Date().toISOString(),
    }),
    read_file: tool({
      description: "Read a file from disk",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
      execute: async ({ path }) => {
        const fs = await import("node:fs/promises");
        return await fs.readFile(path, "utf-8");
      },
    }),
  },
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

async function main() {
  console.log("Halo CLI Agent. 输入 'exit' 退出。\n");

  while (true) {
    const input = await ask("> ");
    if (input === "exit") break;

    const stream = agent.stream(input);
    for await (const chunk of stream) {
      if (chunk.type === "text-delta") {
        process.stdout.write(chunk.delta);
      }
    }
    console.log(); // 响应后换行
  }

  console.log(`\n统计: ${agent.stats.turns} 轮, 缓存命中率: ${((agent.stats.caching?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
  rl.close();
}

main();
```
