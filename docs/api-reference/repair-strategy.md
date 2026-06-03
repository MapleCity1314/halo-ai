# `RepairStrategy` + `BasicRepair`

Interface and built-in implementation for fixing malformed tool calls.

## Interface

```ts
interface RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult;
}

interface RepairResult {
  toolCalls: ToolCall[];
  fixed: number;
  scavenged: number;
  suppressed: number;
  notes: string[];
}
```

## BasicRepair

```ts
import { BasicRepair } from "@halo-ai/strategies";

new BasicRepair()
```

Fixes truncated JSON arguments by balancing braces, brackets, and quotes.

## Usage

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  repair: new BasicRepair(),
});
```
