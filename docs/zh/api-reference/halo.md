# Halo

创建 `HaloAgent` 实例的工厂类。持有共享的 `ModelAdapter`。

## 构造函数

```ts
new Halo(opts: { adapter: ModelAdapter })
```

## `agent(opts)`

```ts
halo.agent(opts: {
  system: string;
  tools?: ToolSpec[] | Record<string, ToolDefinition<any>>;
  fewShots?: ChatMessage[];
  context?: ContextStrategy;
  repair?: RepairStrategy;
  confirmation?: ConfirmationStrategy;
  on?: (event: AgentEvent, payload: unknown) => void;
}): HaloAgent
```

## 示例

```ts
const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });

// 基础
const agent = halo.agent({ system: "你是一个有用的助手。" });

// 带工具和策略
const agent = halo.agent({
  system: "你是一个研究助手。",
  tools: { search: tool({ ... }) },
  context: new TruncateStrategy(),
  on: (event, payload) => console.log(event, payload),
});

// 多个 Agent 共享适配器
const coder = halo.agent({ system: "你是软件工程师。" });
const reviewer = halo.agent({ system: "你是代码审查员。" });
```
