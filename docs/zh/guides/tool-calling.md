# 工具调用

Halo 支持两种工具调用模式。

## 自动执行模式

```ts
const agent = halo.agent({
  system: "你是一个天气助手。",
  tools: {
    get_weather: tool({
      execute: async ({ city }) => {
        const res = await fetch(`https://api.weather.com/${city}`);
        return JSON.stringify(await res.json());
      },
    }),
  },
});

const result = await agent.run("东京和巴黎的天气怎么样？");
```

## 手动模式

```ts
const turn1 = await agent.send("东京天气怎么样？");
// turn1.toolCalls = [{ function: { name: "get_weather", arguments: '{"city":"Tokyo"}' } }]

const weather = await fetchWeatherApi("Tokyo");

const turn2 = await agent.submitToolResult({
  toolCallId: turn1.toolCalls[0].id,
  output: weather,
});
// turn2.content = "东京现在22°C，晴天。"
```

## 工具定义格式

```ts
interface ToolDefinition<TArgs = Record<string, unknown>> {
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute?: (args: TArgs) => string | Promise<string>;
}
```

## 工具结果标记为错误

```ts
await agent.submitToolResult({
  toolCallId: call.id,
  output: "连接天气 API 失败",
  isError: true,
});
```
