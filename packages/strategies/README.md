# @halo-sdk/strategies

Pluggable strategies for context management and tool-call repair in Halo AI SDK.

## Installation

```bash
npm install @halo-sdk/strategies
```

Requires `@halo-sdk/core` as a peer dependency.

## TruncateStrategy

Automatically truncates `MessageLog` when approaching the context window limit. Drops `discardable` messages first (e.g. skill bodies), then oldest messages.

```ts
import { Halo } from "@halo-sdk/core";
import { TruncateStrategy } from "@halo-sdk/strategies";

const agent = halo.agent({
  messages: [{ role: "system", content: "You are helpful." }],
  context: new TruncateStrategy({ maxTokens: 102_400 }), // default: 80% of 128K
});
```

**Important:** The strategy is read-only on `StablePrefix` — it only modifies `MessageLog`. This preserves prefix caching.

## BasicRepair

Fixes truncated JSON in tool-call arguments. Counts unbalanced braces/brackets and closes them.

```ts
import { BasicRepair } from "@halo-sdk/strategies";

const agent = halo.agent({
  messages: [...],
  repair: new BasicRepair(),
});
```

When the model's tool-call JSON is cut off mid-generation, `BasicRepair` tries to salvage it rather than discarding the call.

## Custom Strategies

Implement `ContextStrategy` or `RepairStrategy` from `@halo-sdk/core` for custom behavior:

```ts
import type { ContextStrategy, ChatMessage } from "@halo-sdk/core";

class MyStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    return { history, modified: false, droppedCount: 0 };
  }
}
```

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/en/api-reference/context-strategy) for full API reference.
