# `MessageLog`

In-memory message history with ring-buffer semantics.

## Import

```ts
import { MessageLog } from "@halo-ai/core";
```

## Constructor

```ts
new MessageLog(opts?: { storageLimit?: number }) // default: 10_000
```

## Properties

| Property | Type | Description |
|---|---|---|
| `length` | `number` | Current message count |
| `version` | `number` | Monotonic counter, increments on `append()` and `hydrate()` |

## Methods

| Method | Description |
|---|---|
| `append(msg)` | Add a message. Drops oldest if over `storageLimit` |
| `hydrate(messages)` | Replace all entries. Use for restoring external state |
| `toFullHistory()` | Shallow copy of all messages |
| `recent(n)` | Shallow copy of last N messages |
