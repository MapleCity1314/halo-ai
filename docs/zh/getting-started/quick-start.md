# 5 分钟上手

## 1. 安装

```bash
pnpm add @halo-ai/core @halo-ai/adapters
```

## 2. 设置 API Key

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 3. 创建第一个 Agent

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({ system: "你是一个有用的助手。" });
const result = await agent.send("你好！最近怎么样？");
console.log(result.content);
```

## 4. 添加工具

```ts
import { Halo, tool } from "@halo-ai/core";

const agent = halo.agent({
  system: "你是一个计算器。使用 calculate 工具进行数学运算。",
  tools: {
    calculate: tool({
      description: "计算数学表达式",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "数学表达式" },
        },
        required: ["expression"],
      },
      execute: async ({ expression }) => {
        if (!/^[\d\s+\-*/().]+$/.test(expression)) return "错误：无效表达式";
        return String(Function(`"use strict"; return (${expression})`)());
      },
    }),
  },
});

const result = await agent.run("(42 × 58) + (17 × 23) 等于多少？");
console.log(result.content);
```

## 5. 查看节省

```ts
console.log(`缓存命中率: ${((agent.stats.caching?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
console.log(`预估节省: $${(agent.stats.caching?.estimatedSavingsUsd ?? 0).toFixed(4)}`);
```
