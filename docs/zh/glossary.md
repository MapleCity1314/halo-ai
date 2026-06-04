# 术语表

Halo 生态系统中关键术语和概念的参考。

## 核心概念

| 术语 | 定义 |
|---|---|
| **Agent（智能体）** | 能够对话、使用工具并完成多步骤任务的自主 AI 实体。通过 `halo.agent()` 创建。 |
| **Agent Loop（智能体循环）** | Agent 的迭代过程：调用模型 → 接收工具调用 → 执行工具 → 再次调用模型。持续直到达到 `maxSteps` 或无工具调用剩余。 |
| **Cache-First（缓存优先）** | Halo 的架构理念：将不可变提示内容与动态对话历史分离，以最大化 KV-cache 复用。 |
| **Context Window（上下文窗口）** | 模型单次请求可处理的最大 token 数（如 DeepSeek: 128K）。 |
| **Context Strategy（上下文策略）** | 一个可插拔策略（`ContextStrategy`），在对话历史接近上下文窗口限制时进行管理。 |
| **Few-Shot（少样本示例）** | 包含在稳定前缀中的示例消息，用于引导模型在特定任务上的行为。 |

## 前缀与缓存

| 术语 | 定义 |
|---|---|
| **Stable Prefix（稳定前缀）** | 每个 API 请求的不可变部分：系统提示词 + 工具定义 + few-shot 示例。始终位于消息数组的 position 0。 |
| **Fingerprint（指纹）** | Prefix 内容的 SHA-256 哈希，截断为 16 个十六进制字符。用于追踪 prefix 的变更。 |
| **KV-Cache（键值缓存）** | LLM 提供商维护的键值缓存。当 prefix 与之前的请求匹配时，提供商复用已缓存的计算，而非重新处理。 |
| **Cache Hit（缓存命中）** | 提供商检测到 prefix 未变更并复用 KV-cache。以较低的缓存输入价格计费。 |
| **Cache Miss（缓存未命中）** | Prefix 已变更（或是首次请求），提供商必须处理所有 token。以全价输入价格计费。 |
| **Cache Hit Rate（缓存命中率）** | `hitTokens / (hitTokens + missTokens)`。输入 token 中被缓存的比例。 |
| **Keep-Alive（缓存保活）** | 一种机制（`agent.keepAlive()`），在长时间空闲期间发送定期 ping 以防止提供商清除 KV-cache。 |
| **TTL（生存时间）** | 提供商在清除前保留 KV-cache 的时长（因提供商而异，通常 5-30 分钟）。 |

## 消息

| 术语 | 定义 |
|---|---|
| **Message Log（消息日志）** | Agent 的内存对话历史。仅追加，具有可配置的 `storageLimit`（环形缓冲区语义）。 |
| **Chat Message（聊天消息）** | 包含 `role`（system/user/assistant/tool）和 `content` 的对象。遵循 OpenAI 消息格式。 |
| **System Prompt（系统提示词）** | 定义 agent 行为、个性和约束的初始指令。位于稳定前缀中。 |
| **Turn（轮次）** | 一次用户→助手的交换。每次 `agent.send()` 或 `agent.run()` 调用为一轮。 |

## 工具

| 术语 | 定义 |
|---|---|
| **Tool（工具）** | 模型可调用来执行操作的函数（搜索、计算、获取数据等）。通过 JSON Schema 和可选的 `execute` 函数定义。 |
| **Tool Call（工具调用）** | 模型调用工具的请求，包含函数名和 JSON 参数。 |
| **Tool Spec（工具规范）** | 工具的 JSON Schema 定义，在稳定前缀中发送给模型。 |
| **Repair Strategy（修复策略）** | 在执行前修复格式错误工具调用的可插拔策略。`BasicRepair` 处理截断的 JSON。 |
| **Confirmation Strategy（确认策略）** | 在执行特定工具前要求人工批准的可选策略。 |

## 适配

| 术语 | 定义 |
|---|---|
| **Model Adapter（模型适配器）** | Halo 与模型提供商之间的接口。处理 API 调用、流式输出，并转换提供商特定的缓存细节。 |
| **Provider（提供商）** | 提供 LLM 推理的 AI 模型提供商（DeepSeek、OpenAI、Anthropic 等）。 |
| **DeepSeek Adapter** | Halo 内置的 DeepSeek API 适配器，具有自动前缀缓存功能。 |
| **Pricing Info（价格信息）** | 每个提供商的 token 价格数据（`inputPricePer1k`、`cachedInputPricePer1k`），用于计算节省估算。 |

## 流式输出

| 术语 | 定义 |
|---|---|
| **Stream（流）** | 模型的实时逐 token 输出。Halo 支持原始 `agent.stream()` 和 AI SDK 兼容的 `agent.sdkStream()`。 |
| **Turn Chunk（轮次块）** | 流式响应中的单个事件：`text-delta`、`tool-call-start`、`tool-call-delta` 或 `done`。 |
| **toDataStream** | 一个工具函数，将 Halo 原生流转换为 AI SDK 兼容的 `Response`，用于前端聊天库。 |

## 可观测性

| 术语 | 定义 |
|---|---|
| **Stats（统计信息）** | 运行时指标：`turns`、`totalTokens`、`caching`（命中/未命中 token、命中率、预估节省）。 |
| **Agent Events（Agent 事件）** | Agent 运行期间发出的生命周期事件：`cache:miss`、`context:truncated`、`repair:applied`。 |
| **Usage（用量）** | 每次请求的 token 计数：`promptTokens`、`completionTokens` 和可选的缓存细分。 |
