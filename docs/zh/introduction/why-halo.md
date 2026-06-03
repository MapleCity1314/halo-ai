# 为什么选择 Halo？

Halo 与其他构建 AI Agent 的方法对比。

## Halo vs 裸调 API

```ts
// ❌ 裸调 API：手动管理缓存、手写循环、无追踪
const messages = [{ role: "system", content: "你是..." }, ...history];
const res = await fetch("https://api.deepseek.com/chat/completions", {
  body: JSON.stringify({ messages, tools }),
});
// 缓存是否生效？不知道。
// 返回了工具调用？需要自己写循环。
// 成本追踪？手动从 usage 字段算。
```

```ts
// ✅ Halo：自动缓存、Agent 循环、追踪统计
const agent = halo.agent({ system: "你是...", tools: { ... } });
const result = await agent.run("执行任务");
console.log(agent.stats.caching?.cacheHitRate); // 0.92
```

## Halo vs Vercel AI SDK

| | Halo | Vercel AI SDK |
|---|---|---|
| **定位** | 缓存优先的 Agent 运行时 | 提供商无关的 LLM 工具包 |
| **缓存** | 内置 StablePrefix，自动管理 | 通过选项手动配置 |
| **Agent 循环** | `agent.run()` 自动执行工具 | 手动处理 maxSteps + tools |
| **成本追踪** | `agent.stats.caching` 内置 | 手动计算 |
| **提供商模型** | 带缓存策略的适配器 | 提供商包 |
| **SSE 协议** | 通过 `toDataStream()` 兼容 | 原生 `0:`/`d:` 协议 |
| **适用场景** | Agent 密集、成本敏感、多轮对话 | 通用 LLM 应用、广泛的提供商支持 |

两者互补——Halo 的 `toDataStream()` 使其与 Vercel AI SDK 的 `useChat()` 兼容。

## Halo vs LangChain

| | Halo | LangChain |
|---|---|---|
| **理念** | 极简、缓存优先 | 最大化、抽象优先 |
| **体积** | 每包约 5KB | 500KB+ |
| **缓存** | 自动前缀缓存 | 手动 LCEL 缓存 |
| **学习曲线** | 约 5 分钟 | 数小时到数天 |

## 何时选择 Halo

- 构建带工具调用的**多轮 Agent**
- 关心 **token 成本**，需要自动节省追踪
- 使用 **DeepSeek**（或计划支持多个提供商）
- 想要**最小、可审计的代码**（core 包零外部依赖）
- 部署到**生产环境**，需要 keep-alive、stats 和错误事件

## 何时不选 Halo

- 需要**结构化输出**（JSON 模式、对象生成）——使用 Vercel AI SDK
- 需要**嵌入、图像生成或语音**——直接使用提供商 SDK
- 做**单次提示词**，无对话——裸调 API 即可
