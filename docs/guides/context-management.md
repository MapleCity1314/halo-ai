# Context Management

When conversations grow beyond the model's context window, you need a strategy. Halo provides `ContextStrategy` for this.

## The Problem

```ts
const agent = halo.agent({ system: "..." });

// After 200 turns, the conversation exceeds 128K tokens
// The API call fails or the model loses early context
for (let i = 0; i < 200; i++) {
  await agent.send(`Message ${i}`);
}
```

## Using TruncateStrategy

```ts
import { TruncateStrategy } from "@halo-ai/strategies";

const agent = halo.agent({
  system: "You are a helpful assistant.",
  context: new TruncateStrategy({ maxTokens: 100_000 }), // 100K token budget
});
```

`TruncateStrategy` keeps the prefix (system + tools) intact and only truncates the conversation history. It preserves the most recent messages and drops the oldest ones.

## How It Works

The strategy receives the full prefix and history **separately**. The prefix is read-only — the strategy cannot modify it (which would break caching). Only the history is truncated:

```
Before:
  prefix: [system, ...fewShots]           ← untouched
  history: [msg1, msg2, ..., msg200]      ← too large

After:
  prefix: [system, ...fewShots]           ← still untouched, cache preserved
  history: [msg180, msg181, ..., msg200]  ← truncated to fit budget
```

## Custom Strategy

```ts
import type { ContextStrategy, ChatMessage } from "@halo-ai/core";

class SummarizeStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    // prefix is READ-ONLY — do not modify it!

    if (history.length < 50) {
      return { history, modified: false, droppedCount: 0 };
    }

    // Summarize old messages into a single system-like message
    const oldMessages = history.slice(0, -20);
    const recentMessages = history.slice(-20);

    const summary = `[Earlier conversation summary: ${oldMessages.length} messages about ${extractTopics(oldMessages)}]`;

    return {
      history: [
        { role: "system", content: summary },
        ...recentMessages,
      ],
      modified: true,
      summary,
      droppedCount: oldMessages.length,
    };
  }
}
```

## Monitoring Truncation

```ts
const agent = halo.agent({
  system: "...",
  context: new TruncateStrategy(),
  on: (event, payload) => {
    if (event === "context:truncated") {
      console.log(`Dropped ${payload.droppedCount} messages`);
    }
  },
});
```
