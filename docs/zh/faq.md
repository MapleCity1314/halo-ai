# 常见问题解答

## 概述

### 什么是 Halo？

Halo 是一个 Cache-First 智能体框架，用于构建基于 LLM 的 AI Agent。它通过最大化前缀缓存来减少多轮对话的延迟和成本。

### Halo 与 LangChain 或 AI SDK 有何不同？

Halo 的核心创新是 **StablePrefix** 架构——它将稳定的提示内容（系统提示词、工具定义）与动态对话历史分离。这种分离实现了自动的、跨提供商的前缀缓存，无需手动管理即可在多轮对话中降低 70-90% 的成本。

### Halo 支持哪些 AI 提供商？

内置对 **DeepSeek** 的支持，并提供构建自定义适配器的接口，可连接 OpenAI、Anthropic、Gemini 以及任何兼容 OpenAI API 的端点。

### Halo 是开源的吗？

是的。Halo 基于 MIT 许可证发布，[在 GitHub 上开源](https://github.com/MapleCity1314/halo-ai)。

---

## 快速开始

### 入门需要什么？

- Node.js 18+
- 一个 DeepSeek API 密钥（或其他支持的提供商）
- TypeScript 知识（JavaScript 也可以，但类型安全能显著提升开发体验）

### 可以在没有 TypeScript 的情况下使用 Halo 吗？

可以。虽然 Halo 使用 TypeScript 构建并提供出色的类型推断，但你可以在纯 JavaScript 项目中使用，API 完全相同。

### 如何安装 Halo？

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

---

## 缓存

### 前缀缓存如何工作？

Halo 将稳定内容（系统提示词 + 工具定义 + few-shot 示例）放在每个 API 请求的 position 0。支持前缀缓存的提供商（DeepSeek、OpenAI、Anthropic）检测到不变的 prefix 并复用 KV-cache，以约 74% 的折扣计费缓存 token。

### 使用缓存能节省多少？

典型的多轮对话可为输入 token 节省 **70-90% 的成本**。对于 prefix 约 2,000 token、每轮约 200 token 的 10 轮对话，缓存可节省约 75% 的输入成本。

### 什么会破坏缓存？

- 修改系统提示词
- 添加或移除工具
- 添加或移除 few-shot 示例
- 使用不同 prefix 内容创建新 agent 会话

重置对话历史（`agent.clearLog()`）**不会**破坏缓存。

### 如何监控缓存性能？

```ts
console.log(agent.stats.caching);
// { cacheHitRate: 0.8, totalCacheHitTokens: 8000, estimatedSavingsUsd: 0.0016 }
```

---

## 工具与 Agent

### 可以定义多少个工具？

Halo 没有硬性限制。但每个工具的 JSON Schema 会计入 prefix token 预算。为获得最佳缓存经济性，将工具定义总量控制在 ~5,000 token 以下。

### 可以动态添加工具吗？

可以，但每次 `agent.addTool()` 调用会使下一轮的缓存失效。为获得最佳性能，在 agent 创建时一次性定义所有工具。

### 工具调用修复如何工作？

当模型返回格式错误的工具参数 JSON（常见于响应被截断时），`BasicRepair` 会自动平衡括号、花括号和引号以恢复预期的结构。你也可以实现自定义修复策略。

---

## 部署

### 可以将 Halo 部署到 Serverless 吗？

可以。Halo 可在 Vercel、AWS Lambda、Cloudflare Workers 等平台上运行。详见 [部署到生产环境](/zh/guides/deploying)。

### Halo 在请求之间保持状态吗？

Agent 实例在内存中维护对话历史。对于无状态部署，你需要实现会话持久化。Halo 的 `MessageLog.hydrate()` 方法支持恢复外部状态。

### 如何处理多用户？

为每个用户会话创建一个 agent。每个 agent 维护自己的对话历史和缓存状态。使用会话存储（Redis、数据库）在请求之间持久化和恢复 agent 状态。

---

## 故障排除

### Agent 返回空响应

检查 API 密钥是否正确设置，模型名称是否与提供商匹配。使用 `on` 事件处理器启用错误日志。

### 缓存命中率低于预期

验证：
- 同一 agent 实例在多轮间复用
- 工具在创建时一次性定义，而非增量添加
- 系统提示词在调用间未发生变化
- 提供商支持你所用模型的前缀缓存

### 工具调用失败

启用 `BasicRepair` 策略自动修复格式错误的工具调用参数。检查工具的 JSON Schema 是否有效并与模型返回的内容匹配。
