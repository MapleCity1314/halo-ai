# Testing Agents

How to test Halo agents in your test suite.

## Using MockAdapter

```ts
import { HaloAgentImpl } from "@halo-ai/core";
import { MockAdapter } from "./mock-adapter";

it("agent returns expected response", async () => {
  const adapter = new MockAdapter();
  adapter.chatFn = async () => ({
    content: "Hello!",
    toolCalls: [],
    usage: { promptTokens: 100, completionTokens: 50 },
  });

  const agent = new HaloAgentImpl({
    adapter,
    system: "You are a test agent.",
  });

  const result = await agent.send("hi");
  expect(result.content).toBe("Hello!");
});
```

## MockAdapter with Cache Stats

```ts
adapter.chatFn = async () => ({
  content: "ok",
  toolCalls: [],
  usage: {
    promptTokens: 100,
    completionTokens: 50,
    caching: { hitTokens: 80, missTokens: 20, hitRate: 0.8 },
  },
});

const agent = new HaloAgentImpl({ adapter, system: "..." });
await agent.send("hi");
expect(agent.stats.caching?.cacheHitRate).toBe(0.8);
```

## Testing Tool Calls

```ts
it("agent executes tool and returns result", async () => {
  const adapter = new MockAdapter();
  let callCount = 0;
  adapter.chatFn = async () => {
    callCount++;
    if (callCount === 1) {
      return {
        content: "",
        toolCalls: [{
          id: "call_1",
          type: "function",
          function: { name: "get_weather", arguments: '{"city":"Paris"}' },
        }],
        usage: { promptTokens: 100, completionTokens: 50 },
      };
    }
    return { content: "Paris: 22°C, sunny", toolCalls: [], usage: { promptTokens: 100, completionTokens: 50 } };
  };

  const agent = new HaloAgentImpl({
    adapter,
    system: "You are a weather assistant.",
    tools: [{
      type: "function",
      function: { name: "get_weather", description: "...", parameters: {} },
    }],
  });

  const result = await agent.run("What's the weather?", {
    onToolCall: async () => ({ toolCallId: "call_1", output: "22°C, sunny" }),
  });

  expect(result.content).toBe("Paris: 22°C, sunny");
  expect(agent.stats.turns).toBe(2);
});
```

## Testing Strategies

```ts
it("repair strategy suppresses invalid tool calls", async () => {
  const adapter = new MockAdapter();
  adapter.chatFn = async () => ({
    content: "",
    toolCalls: [{ id: "c1", type: "function", function: { name: "bad_tool", arguments: "{}" } }],
    usage: { promptTokens: 100, completionTokens: 50 },
  });

  const agent = new HaloAgentImpl({
    adapter,
    system: "...",
    repair: {
      repair: (calls) => ({
        toolCalls: [],
        fixed: 0, scavenged: 0, suppressed: calls.length,
        notes: ["suppressed"],
      }),
    },
  });

  const result = await agent.send("test");
  expect(result.toolCalls).toEqual([]);
});
```

## Best Practices

- **Mock the adapter, not the agent** — test the real agent logic with a fake transport
- **Reset between tests** — create a new `MockAdapter` for each test
- **Test cache behavior** — verify `caching` stats after multiple sends
- **Test error paths** — mock adapter to throw, verify event handlers fire
