# Agent Loop

`agent.run()` is the primary interaction mode — an automatic tool-call loop that handles the full model→tool→result→model cycle.

## How It Works

```
agent.run("What's the weather in Paris?")
  │
  ├─► [Turn 1] send("What's the weather in Paris?")
  │     └─► Model returns: { content: "", toolCalls: [get_weather("Paris")] }
  │
  ├─► Execute get_weather("Paris") → "22°C, sunny"
  │     └─► log.append({ role: "tool", content: "22°C, sunny" })
  │
  ├─► [Turn 2] _callModel()
  │     └─► Model returns: { content: "It's 22°C and sunny in Paris.", toolCalls: [] }
  │
  └─► Return: { content: "It's 22°C and sunny in Paris.", toolCalls: [], usage }
```

## Basic Usage

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get current weather",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `${city}: 22°C, sunny`,
    }),
  },
});

const result = await agent.run("What's the weather in Paris?");
console.log(result.content); // "It's 22°C and sunny in Paris."
```

## With maxSteps

Limit the number of tool-call iterations to prevent infinite loops:

```ts
const result = await agent.run("Complex task...", { maxSteps: 5 });
```

If the model continues requesting tools after `maxSteps`, the loop stops and returns the last result with pending tool calls.

## With onStep Callback

Monitor each step of the agent loop:

```ts
const result = await agent.run("Research AI trends", {
  onStep: ({ step, content, toolCalls }) => {
    console.log(`Step ${step}: ${toolCalls.length} tool calls`);
  },
});
```

## With onToolCall Callback

Handle tool execution manually (instead of auto-execute):

```ts
const result = await agent.run("What's the weather?", {
  onToolCall: async (call) => {
    // Call your own API
    const output = await fetchWeatherApi(call.function.arguments);
    return { toolCallId: call.id, output };
  },
});
```

## When to Use send() Instead

| `agent.run()` | `agent.send()` |
|---|---|
| Auto-executes tools | Returns tool calls for manual handling |
| Full agent loop | Single turn |
| Good for autonomous tasks | Good for human-in-the-loop |
| Simplest API | Most control |
