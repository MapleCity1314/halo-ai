# `tool()`

Helper for creating typed tool definitions with auto-execute.

## Import

```ts
import { tool } from "@halo-ai/core";
```

## Signature

```ts
function tool<TArgs = Record<string, unknown>>(
  def: ToolDefinition<TArgs>
): ToolDefinition<TArgs>
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `def.description` | `string` | Human-readable description of what the tool does |
| `def.parameters` | `Record<string, unknown>` | JSON Schema for the tool's arguments |
| `def.execute` | `(args: TArgs) => string \| Promise<string>` | Optional. When provided, `agent.run()` auto-executes |

## Returns

Returns the same `ToolDefinition` object — `tool()` is a type-safe identity function.

## Usage

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
      // No execute — tool calls returned for manual handling
    }),
  },
});
```
