# Agent Events

Events emitted by HaloAgent during operation.

## Type

```ts
type AgentEvent = "cache:miss" | "context:truncated" | "repair:applied";
```

## Subscribing

```ts
const agent = halo.agent({
  system: "...",
  on: (event, payload) => {
    console.log(event, payload);
  },
});
```

## Events

### `cache:miss`

Emitted when the API response shows cache miss tokens (after turn 1).

```ts
{
  type: "cold-start" | "system-changed" | "tools-changed" | "fewshots-changed" | "unknown";
  detail: string;
  added?: string[];
  removed?: string[];
}
```

### `context:truncated`

Emitted when `ContextStrategy.prepare()` modified the history.

```ts
{
  droppedCount: number;
  summary?: string;
}
```

### `repair:applied`

Emitted when `RepairStrategy.repair()` modified tool calls.

```ts
{
  fixed: number;
  suppressed: number;
  notes: string[];
}
```
