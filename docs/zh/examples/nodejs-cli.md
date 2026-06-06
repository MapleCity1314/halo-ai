# Node.js CLI Agent

一个带 **cache-first** 工具调用、keep-alive 和实时统计的交互式命令行 Agent。

> 📂 源码: [`examples/nodejs-cli/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/nodejs-cli)

## 核心特性

- **Cache-first**: 单一 agent 实例，`StablePrefix` 在所有轮次中复用缓存
- **工具自动执行**: `get_time`、`read_file`、`calculator` 通过 `generateText` 自动运行
- **Keep-alive**: 长会话中防止 DeepSeek KV-cache 过期（默认 ~5 分钟）
- **Stats**: 输入 `/stats` 查看缓存命中率、token 用量、成本节省

## 代码（节选）

```ts
import "dotenv/config";
import * as readline from "node:readline";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  messages: [{ role: "system", content: "你是 CLI 助手，保持简洁。" }],
  tools: {
    get_time: tool({ /* ... */ execute: async () => new Date().toISOString() }),
    read_file: tool({ /* ... */ execute: async ({ path }) => await fs.readFile(path, "utf-8") }),
    calculator: tool({ /* ... */ execute: async ({ expression }) => String(eval(expression)) }),
  },
});

// Keep-alive — 每 2 分钟 ping 以维持服务端 KV cache
const { stop } = agent.keepAlive(120_000);

while (true) {
  const input = await ask("> ");
  if (input === "/stats") {
    console.log(`命中率: ${(agent.stats.caching?.cacheHitRate ?? 0) * 100}%`);
    continue;
  }
  if (input === "exit") break;

  const result = await agent.generateText(input, { maxSteps: 8 });
  console.log(result.content);
}

stop();
```

## 运行

```bash
cd examples/nodejs-cli
cp .env.example .env
pnpm install && pnpm dev
```

## 示例会话

```
> 现在几点了？
🤖 当前时间是 2026-03-17T14:30:00.000Z。

> /stats
  命中率: 71.8% | 轮次: 1

> exit
会话: 1 轮, 缓存命中率: 71.8%
```
