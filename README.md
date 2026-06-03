# Halo AI SDK 🌌

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D22-blue.svg)](https://nodejs.org/)
[![pnpm Version](https://img.shields.io/badge/pnpm-10.x-orange.svg)](https://pnpm.io/)
[![Linter: oxlint](https://img.shields.io/badge/linter-oxlint-green.svg)](https://github.com/oxc-project/oxc)
[![Turborepo](https://img.shields.io/badge/built%20with-Turborepo-red.svg)](https://turbo.build/)

> **General-Purpose, Cache-First AI SDK.**  
> 通用、支持前缀缓存优先的 AI Agent 框架（对 DeepSeek 提供开箱即用的深度优化与适配）。具备自动工具执行循环、上下文截断与自修复机制、以及无缝的 SSE 流式传输支持。

---

## 💡 为什么选择 Halo AI？

在开发基于大语言模型的 Agent 时，**提示词缓存（Prompt Caching）** 是降低延迟、节省成本的核心。然而，普通的开发框架在对话历史累积或工具动态增删时，极易破坏缓存前缀，导致大量的缓存失效（Cache Miss）。

Halo AI 采用**通用模型适配器设计（Model Adapter）**，不仅能在通用大模型上运行，还能从底层保障**前缀缓存的最佳命中**（首发对 DeepSeek 进行了深度优化）：
- **指纹式前缀管理 (`StablePrefix`)**：对系统提示词（System Prompt）、工具集（Tool Specs）和 Few-Shot 示例进行静态指纹哈希，确保底层调用顺序与格式严格一致，最大化服务端提示词缓存的命中率。
- **缓存保温机制 (`keepAlive`)**：针对低频或长文本场景，自动发送轻量级的保温 ping，让模型服务端（如 DeepSeek）的 KV 缓存长期保持热状态。
- **自动工具调用循环 (`run`)**：声明式定义工具的 `execute` 逻辑，Agent 内部自动完成“模型请求 → 执行工具 → 返回结果 → 模型决策”的闭环，免去样板代码。
- **自修复与高容错**：内置 JSON 字符串截断自修复（`BasicRepair`），应对极端情况下的输出残缺。

---

## 🏗️ 架构概览

Halo AI 采用模块化的 Monorepo 架构，职责分明且易于扩展：

```
                             ┌────────────────────────┐
                             │       User App /       │
                             │   Vercel AI SDK UI     │
                             └───────────┬────────────┘
                                         │ (messages / input)
                                         ▼
┌────────────────────────────────────────────────────────────────────────┐
│                               Halo SDK                                 │
│                                                                        │
│   ┌────────────────────┐   ┌───────────────────┐   ┌────────────────┐  │
│   │    @halo-ai/core   │   │  @halo-ai/stream  │   │@halo-ai/strateg│  │
│   │  ┌──────────────┐  │   │  ┌─────────────┐  │   │  ┌──────────┐  │  │
│   │  │  HaloAgent   ├──┼──►│  │toDataStream │  │   │  │ Truncate │  │  │
│   │  └──────┬───────┘  │   │  └─────────────┘  │   │  └──────────┘  │  │
│   │         │          │   └───────────────────┘   │  ┌──────────┐  │  │
│   │  ┌──────▼───────┐  │                           │  │BasicRepair  │  │
│   │  │StablePrefix  │  │                           │  └──────────┘  │  │
│   │  └──────────────┘  │                           └────────────────┘  │
│   └─────────┬──────────┘                                               │
└─────────────┼──────────────────────────────────────────────────────────┘
              │ (调用 ModelAdapter 接口传入 prefix 和 history)
              ▼
┌────────────────────────┐
│   @halo-ai/adapters    │
│   (DeepSeekAdapter)    │
┌─────────────┬──────────┘
              │ (HTTP 请求携带 Prompt Caching 字段)
              ▼
┌────────────────────────┐
│   DeepSeek API (v4)    │
└────────────────────────┘
```

---

## 📦 模块构成

| 目录/包名 | 说明 |
|---|---|
| [`packages/core`](./packages/core) | **核心引擎**：定义了 `Halo` 工厂类、`HaloAgent` 运行实例、静态前缀管理器 `StablePrefix` 以及消息日志管理。 |
| [`packages/adapters`](./packages/adapters) | **模型适配器**：目前内置 `DeepSeekAdapter`，封装了对 DeepSeek API 的调用，以及专有的缓存命中使用情况统计。 |
| [`packages/stream`](./packages/stream) | **流式辅助库**：提供了 `toDataStream` 函数，可将 Agent 的流式输出无缝转化为兼容 Vercel AI SDK 的 SSE 数据流。 |
| [`packages/strategies`](./packages/strategies) | **上下文策略**：包括用于避免超出上下文的 `TruncateStrategy` 以及修复残缺/截断 JSON 的 `BasicRepair`。 |
| [`examples/next-halo`](./examples/next-halo) | **示例应用**：一个完整的 Next.js API 路由与 Chat UI 对话示例。 |

---

## 🚀 快速上手

### 1. 安装依赖

```bash
pnpm add @halo-ai/core @halo-ai/adapters
```

### 2. 基础使用 (自动工具循环)

```typescript
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

// 1. 初始化 Halo，绑定 DeepSeek 适配器
const halo = new Halo({
  adapter: new DeepSeekAdapter({ 
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-chat" // 默认为 deepseek-v4-flash
  }),
});

// 2. 创建一个 Agent 实例
const agent = halo.agent({
  system: "你是一个专业的出行助手。当用户查询天气时，请务必使用 get_weather 工具。",
  tools: {
    // 使用 tool() 包裹可以获得优异的类型推导支持
    get_weather: tool({
      description: "获取指定城市的当前天气情况",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "城市名称，例如北京、上海" }
        },
        required: ["city"],
      },
      // 声明工具执行函数，Agent 将自动调用并回填结果
      execute: async ({ city }) => {
        return `【模拟 API 结果】${city}当前天气：晴转多云，22°C，风向东南风。`;
      },
    }),
  },
});

// 3. 运行 Agent (自动处理 Tool 调用循环)
const result = await agent.run("请问上海的天气怎么样？");

console.log("最终回答:", result.content);
console.log("消耗统计:", result.usage);
/*
输出中将包含：
usage: {
  promptTokens: 1200,
  completionTokens: 250,
  caching: {
    hitTokens: 1024,
    missTokens: 176,
    hitRate: 0.85
  }
}
*/
```

### 3. SSE 流式传输 (配合 Next.js API 与 Vercel AI SDK)

你可以将 `HaloAgent` 配合 `@halo-ai/stream` 输出 SSE 响应，在前端直接使用 `useChat` 进行打字机式渲染：

```typescript
// app/api/chat/route.ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    system: "你是一个天气预报助手。",
    tools: {
      get_weather: tool({
        description: "获取天气",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }) => `${city}: 晴，18°C`,
      }),
    },
  });

  // 使用 sdkStream 接收 useChat 历史，并通过 toDataStream 转化为标准 SSE 协议
  return toDataStream(agent.sdkStream(messages));
}
```

---

## 🛠️ 高级特性

### 🔍 实时统计与计费估算

`HaloAgent` 会在内存中追踪当前会话的累积统计数据（`stats`），包括缓存命中率以及节省的费用估算：

```typescript
const agent = halo.agent({ system: "..." });
await agent.run("Hello");

console.log(agent.stats);
/*
{
  turns: 1,
  totalPromptTokens: 1050,
  totalCompletionTokens: 50,
  caching: {
    totalCacheHitTokens: 1024,
    totalCacheMissTokens: 26,
    cacheHitRate: 0.975,
    estimatedSavingsUsd: 0.0002048 // 基于命中率和价格估算节省的美元金额
  },
  ...
}
*/
```

### 🌡️ 缓存保温 (`keepAlive`)

在长时间无交互，或者交互间隔较长的任务中，模型服务端（如 DeepSeek）可能会释放你的提示词 KV 缓存。通过 `keepAlive` 可以在后台进行保温：

```typescript
const agent = halo.agent({ system: "..." });

// 开启保温定时器 (每隔一段时间发送极小代价的探测包维持缓存热度)
const keeper = agent.keepAlive(10 * 60 * 1000); // 每10分钟保温一次

// 任务结束或会话销毁时停止
keeper.stop();
```

### 🛡️ 容错策略 (自修复与动态截断)

在大规模上下文对话中，通过注入策略，能提升 Agent 的稳定性：

```typescript
import { BasicRepair, TruncateStrategy } from "@halo-ai/strategies";

const agent = halo.agent({
  system: "...",
  // 1. 自动截断策略：当历史消息过长时，优先保证只截断 history，保留 stable prefix
  context: new TruncateStrategy({ maxTokens: 100000 }),
  
  // 2. 自修复策略：自动检查模型输出的 Tool 调用的 arguments JSON，若因截断残缺则尝试自动补齐括号/双引号
  repair: new BasicRepair(),
});
```

---

## 💻 本地开发指南

项目采用 Monorepo 结构，使用 `pnpm` 工作空间和 `Turbo` 管理构建：

### 初始化与构建

```bash
# 安装依赖
pnpm install

# 编译所有包
pnpm build

# 清空构建缓存
pnpm clean
```

### 代码测试与规范

项目采用了超快速的 `oxlint` 和 `oxfmt` 进行代码检查与格式化，以及 `vitest` 进行测试：

```bash
# 运行全部单元测试
pnpm test

# 检查代码 Lint 规范
pnpm run lint

# 运行代码自动格式化
pnpm run format

# TypeScript 类型检查
pnpm run typecheck
```

---

## 📄 开源协议

本项目采用 [MIT](./LICENSE) 协议开源。
