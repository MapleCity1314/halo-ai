# SubAgent 模式

使用标准 Halo 工具将任务委托给专门的子 Agent。无需新包 — 子 Agent 就是 `ToolDefinition`，其 `execute` 内部创建短生命周期 `HaloAgent`。

## 核心模式

```ts
const codeReviewer: ToolDefinition<{ code: string }> = {
  description: "审查代码中的 bug 和安全漏洞",
  parameters: {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
  },
  execute: async ({ code }) => {
    // 创建短生命周期 agent — 每次调用独立的上下文
    const agent = halo.agent({
      messages: [
        { role: "system", content: "你是资深代码审查员。找出 bug、安全隐患并给出改进建议。" },
      ],
      model: { temperature: 0.1 },
    });
    const result = await agent.generateText(code);
    return result.content;
  },
};
```

像普通工具一样喂给父 Agent：

```ts
const mainAgent = halo.agent({
  messages: [{ role: "system", content: "你是技术主管。将代码审查委托给 reviewer 工具。" }],
  tools: { code_reviewer: codeReviewer },
});
```

## 何时使用 SubAgent

**使用 SubAgent：**
- 任务可以**并行**执行（三个分析同时进行）
- 子任务需要**不同的工具集**（搜索 agent 需要 Puppeteer，分析 agent 不需要）
- 中间产出**太大**，会撑爆父 Agent 的 MessageLog
- 子任务需要**不同的模型参数**（搜索: temp 0.1，创意: temp 0.9）

**不使用 SubAgent：**
- 任务在一个轮次内就能完成，不造成上下文压力
- 子任务需要父 Agent 的完整对话上下文
- 只是一次简单的查表

## 模式

### 并行派发

模型返回多个独立的工具调用时，并发执行：

```ts
// 在 onToolCall 中:
const results = await Promise.all(
  toolCalls.map(call => {
    const executor = toolExecutors.get(call.function.name);
    return executor?.(JSON.parse(call.function.arguments));
  })
);
```

### 流水线 (Chain)

每一步的输出喂入下一步：

```ts
const search = await searcherAgent.generateText(topic);
const analysis = await analystAgent.generateText(search.content);
const report = await writerAgent.generateText(analysis.content);
```

### 路由器 (Router)

调度器选择调用哪个专家：

```ts
const router: ToolDefinition<{ task: string }> = {
  description: "将任务路由到合适的专家",
  parameters: { ... },
  execute: async ({ task }) => {
    const decision = await routerAgent.generateText(
      `为以下任务选择: 前端、后端还是运维？${task}`
    );
    const agent = { 前端: feAgent, 后端: beAgent, 运维: opsAgent }[decision.content.trim()];
    return (await agent.generateText(task)).content;
  },
};
```

## 输出格式

子 Agent 的结果是父 Agent MessageLog 中的一条工具结果消息。将其结构化以便父 Agent 高效消费：

```ts
execute: async (args) => {
  const result = await subAgent.generateText(JSON.stringify(args));
  return JSON.stringify({
    content: result.content,
    sources: extractSources(result.content),
    confidence: "high",
  });
}
```

## 上下文预算

每次委托子 Agent 都会在父 Agent 的 MessageLog 中产生一条工具结果消息。一个返回 3000 token 散文的冗长子 Agent 会消耗父 Agent 3000 token 上下文。对于机械性任务，在 system prompt 中指示子 Agent 返回压缩输出。

## 模块级复用（缓存命中优化）

对于配置固定的子 Agent，复用单个实例：

```ts
const _reviewer = halo.agent({
  messages: [{ role: "system", content: "你是代码审查员。" }],
  model: { temperature: 0.1 },
});

const codeReviewer: ToolDefinition<{ code: string }> = {
  description: "审查代码",
  parameters: { ... },
  execute: async ({ code }) => {
    const result = await _reviewer.generateText(code);
    _reviewer.clearLog(); // 重置对话，保留前缀缓存
    return result.content;
  },
};
```

权衡：复用 agent 会跨调用共享 `StablePrefix`（首次后缓存命中），但需要在调用间执行 `clearLog()` 防止上下文泄漏。
