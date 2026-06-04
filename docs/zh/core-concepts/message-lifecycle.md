# 消息生命周期

消息从输入到 API 调用再到返回的完整流程。

## 生命周期图

```
用户输入
    │
    ▼
┌──────────────────────────────────────────────┐
│  agent.send(msg) / agent.run(msg)            │
│    └─► log.append({ role: "user", msg })     │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  _resolveHistory()                           │
│    ├─► prefix.toMessages()  → [system, ...]  │
│    ├─► log.toFullHistory()  → [user, ...]    │
│    └─► context.prepare(prefix, history)      │
│         └─► (可选的上下文截断)                │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  adapter.chat(prefix, history, tools)        │
│    └─► POST /chat/completions                │
│         body: { model, messages, tools }     │
│         messages: [...prefix, ...history]    │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  API 响应                                     │
│    ├─► content: string                       │
│    ├─► toolCalls: ToolCall[]                 │
│    └─► usage: Usage (含缓存信息)              │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  后处理                                       │
│    ├─► repair.repair(toolCalls, content)     │
│    ├─► log.append({ role: "assistant", ... })│
│    └─► stats 更新 (tokens, cache hits)       │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Agent 循环 (仅 run())                       │
│    ├─► 如果有 toolCalls: 执行 → 记录结果     │
│    └─► 再次调用 _callModel()                  │
│         (prefix 不变 → 缓存命中)              │
└──────────────────────────────────────────────┘
```

## 关键要点

### Prefix 始终在最前面

适配器分别接收 `prefix` 和 `history`。对于 DeepSeek（以及大多数提供商），消息按 `[...prefix, ...history]` 的顺序发送。Prefix 始终位于 position 0，这使得自动缓存检测成为可能。

### 历史消息只追加不修改

消息按顺序追加到 `MessageLog`。不修改，不重排。日志持续增长直到 `storageLimit`（默认 10,000 条），然后最早的消息会被丢弃。

### 缓存命中是自动的

只要 prefix 在两次调用之间没有变化，DeepSeek 就会检测到匹配并复用 KV-cache。会破坏缓存的操作：

- 修改 system prompt（`agent.setSystem()`）
- 添加/移除工具（`agent.addTool()`）
- 添加/移除 few-shot 示例
- 使用不同 prefix 内容创建新会话

### 上下文策略在 API 调用之前运行

`ContextStrategy.prepare()` 接收完整的 prefix 和 history。它可以截断 history，但**不得**修改 prefix——否则会破坏缓存。

### 修复策略在 API 调用之后运行

`RepairStrategy.repair()` 在工具调用被执行或返回给用户之前修复格式错误的工具调用。它在模型响应之后、agent 循环处理工具调用之前运行。
