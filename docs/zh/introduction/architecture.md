# 架构

Halo 是一个包含六个包的 monorepo。

## 包依赖图

```
Halo (工厂)
  └─► HaloAgent
        ├─► StablePrefix          (稳定：系统提示词 + 工具 + few-shot)
        ├─► MessageLog            (动态：对话轮次)
        ├─► ModelAdapter          (提供商 API 调用)
        ├─► Sandbox?              (可选：文件系统 + 命令执行)
        ├─► Skills?               (可选：渐进披露)
        ├─► ContextStrategy?      (可选：截断/摘要)
        ├─► RepairStrategy?       (可选：JSON 修复/风暴抑制)
        └─► Tool Executors        (Map<name, execute>)

DeepSeekAdapter 实现 ModelAdapter
  └─► fetch → DeepSeek API /chat/completions

/packages/sandbox
  ├─ VirtualSandbox     (内存实现，跨平台)
  └─ ContainerSandbox   (真实 fs + child_process，仅 Node)

/packages/mcp
  └─ createMCPServer()  (桥接外部 MCP 工具)

/packages/stream (独立)
  ├─ toDataStream()
  └─ createHaloStream()

/packages/strategies (独立)
  ├─ TruncateStrategy    实现 ContextStrategy
  └─ BasicRepair         实现 RepairStrategy
```

## 核心层

### StablePrefix

稳定前缀是每个请求的可缓存基础。包含：

- **系统提示词** — Agent 的角色和指令
- **工具定义** — 每个可用工具的 JSON Schema
- **Few-shot 示例** — 可选的示例对话
- **Skills 元数据** — 已发现 Skill 的 name + description

任何对前缀的修改都会触发指纹变化，导致下一次 API 调用缓存未命中——仅一次。之后新前缀再次进入缓存。

### MessageLog

消息日志保存动态对话：用户消息、助手回复和工具结果。是一个简单的环形缓冲区——超过存储上限时，最旧的消息被丢弃。

`clearLog()` 重置日志但不触碰前缀，保留缓存。

### Sandbox

沙箱为 Agent 提供文件系统访问和命令执行能力。两种实现：

- **VirtualSandbox** — 纯内存 `Map`。跨平台（浏览器、Edge、测试）。无 `exec`。
- **ContainerSandbox** — 真实文件系统 + `child_process`。仅 Node.js。路径隔离，含安全检查。

沙箱不进入 `StablePrefix` — 对缓存透明。`sandbox.tools()` 生成的工具进入前缀，但沙箱实例本身不进入。

### Skills

Agent Skills 遵循 [agentskills.io](https://agentskills.io) 渐进披露模式：

- **元数据**（name + description）进入 `StablePrefix` — 始终可见，被缓存。
- **正文**运行时通过自动注册的 `loadSkill` 工具加载 — 进入 `MessageLog`，标记为 `discardable`。

前缀保持精简，同时让 Agent 在需要时获取深层领域知识。

### ModelAdapter

适配器是 Halo 与任何模型提供商之间的唯一接口。它接收**分离的**前缀和历史，让每个适配器决定如何实现缓存：

- **DeepSeek**：`[...prefix, ...history]` —— position 0 的前缀自动缓存
- **Anthropic**：给前缀消息添加 `cache_control` 标记
- **Gemini**：从前缀创建 `CachedContent` 资源
- **OpenAI**：`[...prefix, ...history]` —— 自动缓存

### HaloAgent

Agent 是面向用户的 API。将前缀、日志、适配器、沙箱、Skills 和策略协调成四种交互模式：

1. **`generateText()`** — 完整工具循环
2. **`send()`** / **`submitToolResult()`** — 手动控制：返回工具调用供你执行
3. **`streamText()`** — 流式 + 工具循环
4. **`generateObject()`** — 结构化输出：返回类型化 JSON，工具被抑制

## 请求流程

```
agent.generateText("巴黎天气怎么样？")
  ├─► _resolveHistory()
  │     ├─► prefix.toMessages()  → [system, tools, ...fewShots, skill 元数据]
  │     ├─► log.toFullHistory()  → [user:"巴黎..."]
  │     └─► context.prepare(prefix, history)  → (可选截断)
  ├─► adapter.chat(prefix, history, tools)
  │     └─► POST /chat/completions
  ├─► 模型返回: { content, toolCalls, usage }
  ├─► repair.repair(toolCalls, content)  → (可选修复)
  ├─► log.append({ role: "assistant", ... })
  ├─► stats 更新 (turns, tokens, cache hits)
  └─► 对每个工具调用:
        ├─► 如有 execute → 运行（必要时注入沙箱）
        ├─► 如是 loadSkill → 从磁盘/沙箱读取 SKILL.md
        └─► 追加工具结果 → 循环回模型调用
```
