# Stable Prefix & Message Log

The two core data structures that make cache-first possible.

## StablePrefix

```ts
import { StablePrefix } from "@halo-ai/core";

const prefix = new StablePrefix({
  system: "You are a helpful assistant.",
  tools: [{ type: "function", function: { name: "get_weather", ... } }],
  fewShots: [
    { role: "user", content: "What's 2+2?" },
    { role: "assistant", content: "4" },
  ],
});
```

### Properties

| Property | Type | Description |
|---|---|---|
| `fingerprint` | `string` | SHA-256[:16] fingerprint of the entire prefix. Changes on any mutation. |
| `diagnostics` | `object` | `{ systemHash, toolSpecsHash, fewShotsHash, toolCount, toolNames }` |

### Methods

| Method | Returns | Description |
|---|---|---|
| `toMessages()` | `ChatMessage[]` | Returns `[system, ...fewShots]` as immutable copies |
| `tools()` | `ToolSpec[]` | Returns tool specs as frozen copies |
| `addTool(spec)` | `boolean` | Add a tool. Returns `false` if name already exists. Invalidates fingerprint. |
| `removeTool(name)` | `boolean` | Remove a tool. Invalidates fingerprint. |
| `addFewShot(msg)` | `void` | Add a few-shot example. Invalidates fingerprint. |
| `removeFewShot(index)` | `boolean` | Remove a few-shot by index. Invalidates fingerprint. |

::: warning Fingerprint Invalidation
Any mutation to the prefix invalidates the fingerprint. The next API call will miss the cache **once**, then the server caches the new prefix.
:::

## MessageLog

```ts
import { MessageLog } from "@halo-ai/core";

const log = new MessageLog({ storageLimit: 10_000 });

log.append({ role: "user", content: "Hello" });
log.append({ role: "assistant", content: "Hi there!" });

console.log(log.length); // 2
console.log(log.toFullHistory()); // [{...}, {...}]
console.log(log.recent(1)); // [{ role: "assistant", content: "Hi there!" }]
```

### Properties

| Property | Type | Description |
|---|---|---|
| `length` | `number` | Current number of messages |
| `version` | `number` | Monotonic version, incremented on each append/hydrate |

### Methods

| Method | Description |
|---|---|
| `append(msg)` | Add a message. If over `storageLimit`, drops oldest. |
| `hydrate(messages)` | Replace all entries. Use to restore state from external history. |
| `toFullHistory()` | Shallow copy of all messages |
| `recent(n)` | Shallow copy of last N messages |

## How They Work Together

```
StablePrefix                    MessageLog
┌──────────────────┐           ┌──────────────────┐
│ system prompt    │           │ user: "Hello"    │
│ tool definitions │    +      │ assistant: "Hi"  │
│ few-shot examples│           │ user: "Weather?" │
└──────────────────┘           └──────────────────┘
         │                              │
         └──────────┬───────────────────┘
                    ▼
        [...prefix, ...history]
        → sent to ModelAdapter
```
