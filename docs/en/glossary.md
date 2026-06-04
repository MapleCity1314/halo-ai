# Glossary

A reference of key terms and concepts used throughout the Halo ecosystem.

## Core Concepts

| Term | Definition |
|---|---|
| **Agent** | An autonomous AI entity that can converse, use tools, and complete multi-step tasks. Created via `halo.agent()`. |
| **Agent Loop** | The iterative process where an agent: calls the model → receives tool calls → executes tools → calls the model again. Continues until `maxSteps` is reached or no tool calls remain. |
| **Cache-First** | Halo's architectural philosophy: separate immutable prompt content from dynamic conversation history to maximize KV-cache reuse. |
| **Context Window** | The maximum number of tokens a model can process in a single request (e.g., DeepSeek: 128K). |
| **Context Strategy** | A pluggable policy (`ContextStrategy`) that manages conversation history when it approaches the context window limit. |
| **Few-Shot** | Example messages included in the stable prefix to guide the model's behavior for specific tasks. |

## Prefix & Caching

| Term | Definition |
|---|---|
| **Stable Prefix** (`StablePrefix`) | The immutable portion of every API request: system prompt + tool definitions + few-shot examples. Always at position 0 in the messages array. |
| **Fingerprint** | A SHA-256 hash of the prefix content, truncated to 16 hex characters. Tracks when the prefix changes. |
| **KV-Cache** | The key-value cache maintained by LLM providers. When a prefix matches a previous request, the provider reuses cached computations instead of reprocessing. |
| **Cache Hit** | When the provider detects the prefix hasn't changed and reuses the KV-cache. Billed at the lower cached input price. |
| **Cache Miss** | When the prefix has changed (or it's the first request) and the provider must process all tokens. Billed at full input price. |
| **Cache Hit Rate** | `hitTokens / (hitTokens + missTokens)`. The proportion of input tokens that were cached. |
| **Keep-Alive** | A mechanism (`agent.keepAlive()`) that sends periodic pings to prevent the provider from evicting the KV-cache during long idle periods. |
| **TTL** | Time-to-Live. The duration a provider keeps the KV-cache before eviction (varies by provider, typically 5-30 minutes). |

## Messaging

| Term | Definition |
|---|---|
| **Message Log** (`MessageLog`) | The agent's in-memory conversation history. Append-only with a configurable `storageLimit` (ring-buffer semantics). |
| **Chat Message** (`ChatMessage`) | An object with `role` (system/user/assistant/tool) and `content`. Follows the OpenAI message format. |
| **System Prompt** | The initial instruction that defines the agent's behavior, personality, and constraints. Lives in the stable prefix. |
| **Turn** | A single user→assistant exchange. Each `agent.send()` or `agent.run()` call is one turn. |

## Tools

| Term | Definition |
|---|---|
| **Tool** | A function the model can call to perform actions (search, calculate, fetch data, etc.). Defined with a JSON Schema and optional `execute` function. |
| **Tool Call** | The model's request to invoke a tool, containing the function name and JSON arguments. |
| **Tool Spec** (`ToolSpec`) | The JSON Schema definition of a tool, sent to the model in the stable prefix. |
| **Repair Strategy** (`RepairStrategy`) | A pluggable policy that fixes malformed tool calls before execution. `BasicRepair` handles truncated JSON. |
| **Confirmation Strategy** | An optional policy for requiring human approval before executing specific tools. |

## Adaptation

| Term | Definition |
|---|---|
| **Model Adapter** (`ModelAdapter`) | The interface between Halo and a model provider. Handles API calls, streaming, and translating provider-specific caching details. |
| **Provider** | An AI model provider (DeepSeek, OpenAI, Anthropic, etc.) that serves LLM inference. |
| **DeepSeek Adapter** | Halo's built-in adapter for the DeepSeek API, with automatic prefix caching. |
| **Pricing Info** | Per-provider token pricing data (`inputPricePer1k`, `cachedInputPricePer1k`) used to calculate savings estimates. |

## Streaming

| Term | Definition |
|---|---|
| **Stream** | Real-time token-by-token output from the model. Halo supports both raw `agent.stream()` and AI SDK-compatible `agent.sdkStream()`. |
| **Turn Chunk** | A single event in a streaming response: `text-delta`, `tool-call-start`, `tool-call-delta`, or `done`. |
| **toDataStream** | A utility that converts Halo's native stream into an AI SDK-compatible `Response` for use with frontend chat libraries. |

## Observability

| Term | Definition |
|---|---|
| **Stats** (`AgentStats`) | Runtime metrics: `turns`, `totalTokens`, `caching` (hit/miss tokens, hit rate, estimated savings). |
| **Agent Events** | Lifecycle events emitted during agent operation: `cache:miss`, `context:truncated`, `repair:applied`. |
| **Usage** (`Usage`) | Per-request token counts: `promptTokens`, `completionTokens`, and optional caching breakdown. |
