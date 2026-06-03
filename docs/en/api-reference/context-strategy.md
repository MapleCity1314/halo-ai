# `ContextStrategy` + `TruncateStrategy`

Interface and built-in implementation for context window management.

## Interface

```ts
interface ContextStrategy {
  prepare(
    prefix: ChatMessage[],    // READ-ONLY — do not modify
    history: ChatMessage[],   // May be truncated / summarized
    ctxMax: number,           // Model's context window size
  ): {
    history: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  };
}
```

## TruncateStrategy

```ts
import { TruncateStrategy } from "@halo-ai/strategies";

new TruncateStrategy(opts?: { maxTokens?: number })
// Default maxTokens: 102_400 (80% of 128K)
```

Keeps the most recent messages that fit the token budget. The prefix is untouched.

## Usage

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  context: new TruncateStrategy({ maxTokens: 50_000 }),
});
```

## Custom Strategy

Implement `ContextStrategy`:

```ts
class MyStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    // Never modify prefix — it would break caching!
    return { history, modified: false, droppedCount: 0 };
  }
}
```
