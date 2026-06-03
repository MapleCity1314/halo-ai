# 安装

## 前置要求

- Node.js 18+
- pnpm（推荐）、npm 或 yarn

## 安装

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

可选策略包：

```bash
pnpm add @halo-ai/strategies
```

## 环境变量

创建 `.env.local` 文件：

```bash
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

## 验证安装

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({ system: "你是一个有用的助手。" });
const result = await agent.send("你好！");
console.log(result.content); // "你好！有什么可以帮助你的吗？"
```

## 下一步

- [5 分钟上手](/zh/getting-started/quick-start)
- [Next.js App Router](/zh/getting-started/nextjs-app-router)
- [Node.js](/zh/getting-started/nodejs)
