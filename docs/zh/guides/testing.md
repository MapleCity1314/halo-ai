# 测试 Agent

如何在测试套件中测试 Halo Agent。

## 使用 MockAdapter

```ts
import { HaloAgentImpl } from "@halo-ai/core";
import { MockAdapter } from "./mock-adapter";

it("agent 返回预期的响应", async () => {
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

## MockAdapter 配合缓存统计

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

## 测试工具调用

```ts
it("agent 执行工具并返回结果", async () => {
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

## 测试策略

```ts
it("修复策略抑制无效的工具调用", async () => {
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

## 最佳实践

- **Mock 适配器，而非 Agent**：用假传输层测试真实的 agent 逻辑
- **每个测试重置**：为每个测试创建新的 `MockAdapter`
- **测试缓存行为**：在多次发送后验证 `caching` 统计
- **测试错误路径**：Mock 适配器抛出异常，验证事件处理器触发
