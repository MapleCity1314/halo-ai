# Agent 事件

HaloAgent 在运行期间发出的事件。

## 类型

```ts
type AgentEvent = "cache:miss" | "context:truncated" | "repair:applied";
```

## 订阅

```ts
const agent = halo.agent({
  system: "...",
  on: (event, payload) => {
    console.log(event, payload);
  },
});
```

## 事件详情

### `cache:miss`

当 API 响应显示缓存未命中 token 时发出（在第 1 轮之后）。

```ts
{
  type: "cold-start" | "system-changed" | "tools-changed" | "fewshots-changed" | "unknown";
  detail: string;
  added?: string[];
  removed?: string[];
}
```

### `context:truncated`

当 `ContextStrategy.prepare()` 修改了历史时发出。

```ts
{
  droppedCount: number;
  summary?: string;
}
```

### `repair:applied`

当 `RepairStrategy.repair()` 修改了工具调用时发出。

```ts
{
  fixed: number;
  suppressed: number;
  notes: string[];
}
```
