# 构建一个 Agent

完整的 Agent 构建教程。

## 1. 初始化

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});
```

## 2. 定义工具

```ts
const agent = halo.agent({
  system: "你是一个研究助手。使用工具准确回答问题。",
  tools: {
    search_web: tool({
      description: "搜索网页获取信息",
      parameters: {
        type: "object",
        properties: { query: { type: "string" } },
        required: ["query"],
      },
      execute: async ({ query }) => {
        const results = await fetch(`https://api.search.com?q=${query}`);
        return JSON.stringify(await results.json());
      },
    }),
    calculate: tool({
      description: "执行计算",
      parameters: {
        type: "object",
        properties: { expression: { type: "string" } },
        required: ["expression"],
      },
      execute: async ({ expression }) => String(eval(expression)),
    }),
  },
});
```

## 3. 运行

```ts
const result = await agent.run("东京人口除以巴黎人口是多少？");
console.log(result.content);
```

## 4. 检查统计

```ts
console.log(`轮次: ${agent.stats.turns}`);
console.log(`缓存命中率: ${((agent.stats.caching?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
// 轮次: 3
// 缓存命中率: 85%
```
