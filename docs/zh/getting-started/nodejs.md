# Node.js

在 Node.js 服务器、CLI 脚本或后台任务中使用 Halo。

## 基础用法

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

// 单轮对话
const result = await agent.send("Hello!");
console.log(result.content);

// 多轮对话
await agent.send("My name is Alice.");
const reply = await agent.send("What's my name?");
console.log(reply.content); // "Your name is Alice."

// 带工具的 Agent
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

// 查看缓存统计
console.log(agent.stats.caching?.cacheHitRate); // 例如 0.92
console.log(agent.stats.caching?.estimatedSavingsUsd); // 例如 0.00024
```

## Node.js 中的流式输出

```ts
const stream = agent.stream("Tell me a story.");
for await (const chunk of stream) {
  if (chunk.type === "text-delta") {
    process.stdout.write(chunk.delta);
  }
}
```

## 长时间任务的缓存保活

```ts
const keepAlive = agent.keepAlive(60_000); // 每 60 秒 ping 一次

// ... 执行长时间运行的任务（不超过缓存 TTL）...

keepAlive.stop();
```

## 最佳实践

- **复用 Agent 实例**：一个 agent 实例可处理多次对话，充分利用前缀缓存
- **使用 `clearLog()` 重置对话**：清除历史消息但保留前缀缓存
- **合理设置 `maxSteps`**：限制 agent 循环的最大步数，避免无限循环
