# Agent 循环

`agent.run()` 是主要的交互模式——自动工具调用循环。

## 工作原理

```
agent.run("巴黎天气怎么样？")
  ├─► [第1轮] send("巴黎天气怎么样？")
  │     └─► 模型返回: { content: "", toolCalls: [get_weather("巴黎")] }
  ├─► 执行 get_weather("巴黎") → "22°C, 晴天"
  │     └─► log.append({ role: "tool", content: "22°C, 晴天" })
  ├─► [第2轮] _callModel()
  │     └─► 模型返回: { content: "巴黎现在22°C，晴天。", toolCalls: [] }
  └─► 返回: { content: "巴黎现在22°C，晴天。", ... }
```

## 基本用法

```ts
const agent = halo.agent({
  system: "你是一个天气助手。",
  tools: {
    get_weather: tool({
      execute: async ({ city }) => `${city}: 22°C, 晴天`,
    }),
  },
});

const result = await agent.run("巴黎天气怎么样？");
```

## 限制步数

```ts
const result = await agent.run("复杂任务...", { maxSteps: 5 });
```

## 监听步骤

```ts
const result = await agent.run("调研 AI 趋势", {
  onStep: ({ step, content, toolCalls }) => {
    console.log(`第${step}步: ${toolCalls.length} 个工具调用`);
  },
});
```

## 手动处理工具

```ts
const result = await agent.run("天气怎么样？", {
  onToolCall: async (call) => {
    const output = await fetchWeatherApi(call.function.arguments);
    return { toolCallId: call.id, output };
  },
});
```

## 何时使用 send() 代替 run()

| `agent.run()` | `agent.send()` |
|---|---|
| 自动执行工具 | 返回工具调用供手动处理 |
| 完整的 Agent 循环 | 单轮交互 |
| 适合自主任务 | 适合人机协同 |
