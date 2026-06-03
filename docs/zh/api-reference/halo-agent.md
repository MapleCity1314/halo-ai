# HaloAgent API

核心交互单元。管理单个对话的前缀、日志、工具和策略。

## 属性

### `stats`

```ts
get stats(): Readonly<SessionStats>
```

## 方法

### `run(input, opts?)`

运行自动工具调用循环。

```ts
agent.run(input: string, opts?: {
  maxSteps?: number;
  onToolCall?: (call: ToolCall) => Promise<ToolResult>;
  onStep?: (s: { step: number; content: string; toolCalls: ToolCall[] }) => void;
}): Promise<TurnResult>
```

### `send(input)`

发送消息。返回工具调用供手动处理。

### `stream(input)`

流式输出响应。

### `sdkStream(messages)`

AI SDK 兼容入口。接收 `useChat()` 的 UIMessages。

### `submitToolResult(result)`

提交工具执行结果。

### `hydrate(messages)`

从外部历史恢复对话状态。

### `addTool(spec)` / `removeTool(name)`

管理工具。触发缓存未命中。

### `keepAlive(intervalMs?)`

启动周期性 ping 维持服务端 KV 缓存。

### `clearLog()`

重置对话历史。前缀不受影响。

### `setSystem(system)`

更改系统提示词。触发缓存未命中。
