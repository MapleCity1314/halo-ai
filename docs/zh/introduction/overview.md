# 概述

Halo AI SDK 是一个 **Cache-First 智能体框架**，用于构建具有自动前缀缓存的 AI 应用，支持多种模型提供商。

## 什么是 Halo？

Halo 提供统一的 API 来构建 AI Agent，支持 DeepSeek、OpenAI、Anthropic、Gemini 以及任何 OpenAI 兼容的提供商——同时自动最大化缓存命中率，降低延迟和成本。

核心思想：**将稳定内容与动态内容分离。** 系统提示词、工具定义和 few-shot 示例形成稳定的"前缀"，在对话轮次之间永不改变。只有对话历史会变化。这种分离让提供商缓存前缀，将 token 成本削减高达 74%。

## 为什么选择 Halo？

| | Halo | 裸调 API |
|---|---|---|
| **缓存** | 自动——内置稳定前缀管理 | 手动——每次请求都要自己构建 |
| **工具调用** | `agent.run()` ——自动循环+执行器 | 手动循环——手写 while/tool/dispatch |
| **提供商切换** | 改一行 (`new OpenAiAdapter(...)`) | 重写所有 API 调用逻辑 |
| **流式传输** | `toDataStream()` ——与 useChat 开箱兼容 | 手动构建 SSE 协议 |
| **成本追踪** | `agent.stats.caching.estimatedSavingsUsd` | 手动从 API 响应计算 |
| **保活** | `agent.keepAlive()` ——一行调用 | 自行研究提供商特定的 ping 策略 |

## 包列表

| 包 | 描述 |
|---|---|
| `@halo-ai/core` | `Halo` 工厂、`HaloAgent`、`StablePrefix`、`MessageLog`、类型定义 |
| `@halo-ai/adapters` | `DeepSeekAdapter`（更多适配器即将推出） |
| `@halo-ai/stream` | `toDataStream`、`createHaloStream` |
| `@halo-ai/strategies` | `TruncateStrategy`、`BasicRepair` |

## 支持的提供商

| 提供商 | 适配器 | 缓存方式 |
|---|---|---|
| DeepSeek | `DeepSeekAdapter` | Position-0 前缀缓存 |
| OpenAI | 自定义适配器 (~30 行) | 自动缓存 |
| Anthropic | 自定义适配器 (~40 行) | cache_control 断点 |
| Gemini | 自定义适配器 (~50 行) | CachedContent 资源 |
| Kimi / GLM / MiniMax | OpenAI 兼容适配器 | 视提供商而定 |
