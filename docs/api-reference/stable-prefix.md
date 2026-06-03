# `StablePrefix`

Manages the immutable prefix (system prompt + tools + few-shots) with SHA-256 fingerprinting.

## Import

```ts
import { StablePrefix } from "@halo-ai/core";
```

## Constructor

```ts
new StablePrefix(opts: {
  system: string;
  tools: ToolSpec[];
  fewShots?: ChatMessage[];
  hashFn?: (input: string) => string;
})
```

## Properties

| Property | Type | Description |
|---|---|---|
| `fingerprint` | `string` | SHA-256[:16] hex. Changes on any mutation to system, tools, or few-shots |
| `diagnostics` | `object` | `{ systemHash, toolSpecsHash, fewShotsHash, toolCount, toolNames }` |

## Methods

| Method | Returns | Description |
|---|---|---|
| `toMessages()` | `ChatMessage[]` | `[system, ...fewShots]` — immutable copies |
| `tools()` | `ToolSpec[]` | Frozen shallow copy of tool specs |
| `addTool(spec)` | `boolean` | Add tool. `false` if name exists. Invalidates fingerprint |
| `removeTool(name)` | `boolean` | Remove tool. Invalidates fingerprint |
| `addFewShot(msg)` | `void` | Add few-shot example. Invalidates fingerprint |
| `removeFewShot(index)` | `boolean` | Remove few-shot by index. Invalidates fingerprint |
