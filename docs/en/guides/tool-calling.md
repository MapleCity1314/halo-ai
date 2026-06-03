# Tool Calling

Halo supports two tool-calling modes: **auto-execute** (simplest) and **manual** (most control).

## Auto-Execute Mode

Define tools with `execute()` and use `agent.run()` — the agent handles everything:

```ts
const agent = halo.agent({
  system: "You are a weather assistant.",
  tools: {
    get_weather: tool({
      description: "Get current weather",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => {
        const res = await fetch(`https://api.weather.com/${city}`);
        return JSON.stringify(await res.json());
      },
    }),
  },
});

// One call — agent handles tool execution automatically
const result = await agent.run("What's the weather in Tokyo and Paris?");
```

## Manual Mode

Use `agent.send()` to get tool calls back, execute them yourself, then feed results via `submitToolResult()`:

```ts
// Step 1: Send message
const turn1 = await agent.send("What's the weather in Tokyo?");
// turn1.toolCalls = [{ function: { name: "get_weather", arguments: '{"city":"Tokyo"}' } }]

// Step 2: Execute tool manually
const weather = await fetchWeatherApi("Tokyo");

// Step 3: Submit result
const turn2 = await agent.submitToolResult({
  toolCallId: turn1.toolCalls[0].id,
  output: weather,
});
// turn2.content = "It's 22°C and sunny in Tokyo."
```

## Manual with onToolCall

```ts
const result = await agent.run("What's the weather in Tokyo?", {
  onToolCall: async (call) => {
    // Custom tool execution logic
    const output = await myCustomToolHandler(call.function.name, call.function.arguments);
    return { toolCallId: call.id, output };
  },
});
```

## Tool Definition Format

```ts
interface ToolDefinition<TArgs = Record<string, unknown>> {
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
  execute?: (args: TArgs) => string | Promise<string>;
}
```

Or use the raw `ToolSpec` format (OpenAI-compatible):

```ts
const spec: ToolSpec = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get current weather",
    parameters: { /* JSON Schema */ },
  },
};
```

## Tool Results as Errors

Mark a tool result as an error to let the model know something went wrong:

```ts
await agent.submitToolResult({
  toolCallId: call.id,
  output: "Failed to connect to weather API",
  isError: true,
});
```
