# 架构

Halo 是一个包含四个包的 monorepo。

## 包依赖图

```
Halo (工厂)
  └─► HaloAgent
        ├─► StablePrefix          (稳定：系统提示词 + 工具 + few-shot)
        ├─► MessageLog            (动态：对话轮次)
        ├─► ModelAdapter          (提供商 API 调用)
        ├─► ContextStrategy?      (可选：截断/摘要)
        ├─► RepairStrategy?       (可选：JSON 修复/风暴抑制)
        └─► ConfirmationStrategy? (可选：工具确认)

DeepSeekAdapter 实现 ModelAdapter
  └─► fetch → DeepSeek API /chat/completions

/stream (独立)
  ├─ toDataStream()
  └─ createHaloStream()

/strategies (独立)
  ├─ TruncateStrategy    实现 ContextStrategy
  └─ BasicRepair         实现 RepairStrategy
```

## 核心层

### StablePrefix

稳定前缀是每个请求的可缓存基础。包含：

- **系统提示词** — Agent 的角色和指令
- **工具定义** — 每个可用工具的 JSON Schema
- **Few-shot 示例** — 可选的示例对话

任何对前缀的修改都会触发指纹变化，导致下一次 API 调用缓存未命中——仅一次。之后新前缀再次进入缓存。

### MessageLog

消息日志保存动态对话：用户消息、助手回复和工具结果。是一个简单的环形缓冲区——超过存储上限时，最旧的消息被丢弃。

`clearLog()` 重置日志但不触碰前缀，保留缓存。

### ModelAdapter

适配器是 Halo 与任何模型提供商之间的唯一接口。它接收**分离的**前缀和历史，让每个适配器决定如何实现缓存：

- **DeepSeek**：`[...prefix, ...history]` —— position 0 的前缀自动缓存
- **Anthropic**：给前缀消息添加 `cache_control` 标记
- **Gemini**：从前缀创建 `CachedContent` 资源
- **OpenAI**：`[...prefix, ...history]` —— 自动缓存

### HaloAgent

Agent 是面向用户的 API。将前缀、日志、适配器和策略协调成三种交互模式：

1. **`run()`** — 自动工具循环
2. **`send()`** — 手动模式：返回工具调用供你执行
3. **`stream()`** — 流式模式：返回文本增量和工具调用

## 请求流程

```
agent.run("巴黎天气怎么样？")
  ├─► _resolveHistory()
  │     ├─► prefix.toMessages()  → [system, tools, ...fewShots]
  │     ├─► log.toFullHistory()  → [user:"巴黎..."]
  │     └─► context.prepare(prefix, history)  → (可选截断)
  ├─► adapter.chat(prefix, history, tools)
  │     └─► POST /chat/completions
  ├─► 模型返回: { content, toolCalls, usage }
  ├─► repair.repair(toolCalls, content)  → (可选修复)
  ├─► log.append({ role: "assistant", ... })
  ├─► stats 更新 (turns, tokens, cache hits)
  └─► 如有工具调用: 执行 → 记录结果 → 再次调用模型
```
