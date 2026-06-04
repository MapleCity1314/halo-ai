# `tool()`

创建带类型安全、可自动执行的工具定义的辅助函数。

## 导入

```ts
import { tool } from "@halo-ai/core";
```

## 签名

```ts
function tool<TArgs = Record<string, unknown>>(
  def: ToolDefinition<TArgs>
): ToolDefinition<TArgs>
```

## 参数

| 参数 | 类型 | 描述 |
|---|---|---|
| `def.description` | `string` | 工具功能的人类可读描述 |
| `def.parameters` | `Record<string, unknown>` | 工具参数的 JSON Schema |
| `def.execute` | `(args: TArgs) => string \| Promise<string>` | 可选。提供后，`agent.run()` 将自动执行 |

## 返回值

返回相同的 `ToolDefinition` 对象 — `tool()` 是一个类型安全的恒等函数。

## 使用

```ts
import { Halo, tool } from "@halo-ai/core";

const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get current weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: { type: "string", description: "City name" },
        },
        required: ["city"],
      },
      execute: async ({ city }) => {
        const res = await fetch(`https://api.weather.com/${city}`);
        return JSON.stringify(await res.json());
      },
    }),

    search: tool({
      description: "Search the web",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
        },
        required: ["query"],
      },
      // 未提供 execute — 工具调用返回给用户手动处理
    }),
  },
});
```
