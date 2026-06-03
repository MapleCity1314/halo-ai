# Architecture

Halo is organized as a monorepo with four packages. Here's how they fit together.

## Package Dependency Graph

```
Halo (factory)
  └─► HaloAgent
        ├─► StablePrefix          (stable: system + tools + few-shots)
        ├─► MessageLog            (dynamic: conversation turns)
        ├─► ModelAdapter          (provider API calls)
        ├─► ContextStrategy?      (optional: truncation / summarization)
        ├─► RepairStrategy?       (optional: JSON fix / storm suppression)
        └─► ConfirmationStrategy? (optional: tool approval)

DeepSeekAdapter implements ModelAdapter
  └─► fetch → DeepSeek API /chat/completions

/stream (independent)
  ├─ toDataStream()
  └─ createHaloStream()

/strategies (independent)
  ├─ TruncateStrategy    implements ContextStrategy
  └─ BasicRepair         implements RepairStrategy
```

## Core Layers

### StablePrefix

The stable prefix is the cacheable foundation of every request. It contains:

- **System prompt** — the agent's personality and instructions
- **Tool definitions** — JSON Schema for each tool the agent can call
- **Few-shot examples** — optional example exchanges

Any mutation to the prefix triggers a fingerprint change, which causes the next API call to miss the cache — exactly once. After that, the new prefix is cached again.

### MessageLog

The message log holds the dynamic conversation: user messages, assistant responses, and tool results. It's a simple ring buffer — when the storage limit is reached, the oldest messages are dropped.

`clearLog()` resets the log without touching the prefix, preserving the cache.

### ModelAdapter

The adapter is the single interface between Halo and any model provider. It receives **separated** prefix and history, letting each adapter decide how to achieve caching:

- **DeepSeek**: `[...prefix, ...history]` — prefix at position 0 is auto-cached
- **Anthropic**: Adds `cache_control` markers to prefix messages
- **Gemini**: Creates a `CachedContent` resource from the prefix
- **OpenAI**: `[...prefix, ...history]` — automatic caching

### HaloAgent

The agent is the user-facing API. It coordinates prefix, log, adapter, and strategies into three interaction modes:

1. **`run()`** — Auto tool loop: model → tool execution → result → model (repeat until done)
2. **`send()`** — Manual: returns tool calls for you to execute
3. **`stream()`** — Streaming: yields text deltas and tool calls as they arrive

## Request Flow

```
agent.run("What's the weather?")
  │
  ├─► _resolveHistory()
  │     ├─► prefix.toMessages()    → [system, tools, ...fewShots]
  │     ├─► log.toFullHistory()    → [user:"What's..."]
  │     └─► context.prepare(prefix, history)  → (optional truncation)
  │
  ├─► adapter.chat(prefix, history, tools)
  │     └─► POST /chat/completions
  │           body: { model, messages: [...prefix, ...history], tools }
  │
  ├─► Model returns: { content, toolCalls, usage }
  │
  ├─► repair.repair(toolCalls, content)  → (optional fix)
  ├─► log.append({ role: "assistant", content, tool_calls })
  ├─► stats updated (turns, tokens, cache hits)
  │
  └─► If tool calls: execute → log result → call model again
```
