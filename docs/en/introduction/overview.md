# Overview

Halo AI SDK is a **Cache-First Agent Framework** for building AI applications with automatic prefix caching across multiple model providers.

## What is Halo?

Halo gives you a single, unified API to build AI agents that work with DeepSeek, OpenAI, Anthropic, Gemini, and any OpenAI-compatible provider — while automatically maximizing cache hits to reduce latency and cost.

The core insight: **separate stable content from dynamic content.** Your system prompt, tool definitions, and few-shot examples form a stable "prefix" that never changes between turns. Only the conversation history changes. This separation lets providers cache the prefix, slashing token costs by up to 74%.

## Why Halo?

| | Halo | Raw API Calls |
|---|---|---|
| **Caching** | Automatic — stable prefix management built in | Manual — you must structure every request yourself |
| **Tool Calls** | `agent.run()` — auto-loop with executors | Manual loop — write your own while/tool/dispatch |
| **Provider Switch** | Change 1 line (`new OpenAiAdapter(...)`) | Rewrite all API call logic |
| **Streaming** | `toDataStream()` — useChat compatible out of the box | Build SSE protocol yourself |
| **Cost Tracking** | `agent.stats.caching.estimatedSavingsUsd` | Track manually from API responses |
| **Keep-Alive** | `agent.keepAlive()` — one call | Figure out provider-specific ping strategy |

## Packages

| Package | Description |
|---|---|
| `@halo-ai/core` | `Halo` factory, `HaloAgent`, `StablePrefix`, `MessageLog`, types |
| `@halo-ai/adapters` | `DeepSeekAdapter` (more coming) |
| `@halo-ai/stream` | `toDataStream`, `createHaloStream` |
| `@halo-ai/strategies` | `TruncateStrategy`, `BasicRepair` |

## Supported Providers

| Provider | Adapter | Caching |
|---|---|---|
| DeepSeek | `DeepSeekAdapter` | Prefix (position 0) |
| OpenAI | Custom adapter (~30 lines) | Automatic |
| Anthropic | Custom adapter (~40 lines) | cache_control breakpoints |
| Gemini | Custom adapter (~50 lines) | CachedContent resource |
| Kimi / GLM / MiniMax | OpenAI-compatible adapter | Provider-dependent |
