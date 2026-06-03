# Message Lifecycle

How messages flow through Halo from input to API call and back.

## Lifecycle Diagram

```
User Input
    │
    ▼
┌──────────────────────────────────────────────┐
│  agent.send(msg) / agent.run(msg)            │
│    └─► log.append({ role: "user", msg })     │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  _resolveHistory()                           │
│    ├─► prefix.toMessages()  → [system, ...]  │
│    ├─► log.toFullHistory()  → [user, ...]    │
│    └─► context.prepare(prefix, history)      │
│         └─► (optional truncation)            │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  adapter.chat(prefix, history, tools)        │
│    └─► POST /chat/completions                │
│         body: { model, messages, tools }     │
│         messages: [...prefix, ...history]    │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  API Response                                 │
│    ├─► content: string                       │
│    ├─► toolCalls: ToolCall[]                 │
│    └─► usage: Usage (with caching info)      │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Post-Processing                              │
│    ├─► repair.repair(toolCalls, content)     │
│    ├─► log.append({ role: "assistant", ... })│
│    └─► stats updated (tokens, cache hits)    │
└──────────────────────────────────────────────┘
    │
    ▼
┌──────────────────────────────────────────────┐
│  Agent Loop (run() only)                     │
│    ├─► If toolCalls: execute → log result    │
│    └─► Call _callModel() again               │
│         (prefix unchanged → cache HIT)       │
└──────────────────────────────────────────────┘
```

## Key Points

### Prefix is Always First

The adapter receives `prefix` and `history` separately. For DeepSeek (and most providers), messages are sent as `[...prefix, ...history]`. The prefix is always at position 0, enabling automatic cache detection.

### History is Append-Only

Messages are appended to `MessageLog` in order. No modifications, no reordering. The log grows until `storageLimit` (default 10,000), then oldest messages are dropped.

### Cache Hits Are Automatic

As long as the prefix doesn't change between calls, DeepSeek detects the match and reuses the KV-cache. The only things that break the cache:

- Changing the system prompt (`agent.setSystem()`)
- Adding/removing tools (`agent.addTool()`)
- Adding/removing few-shot examples
- Creating a new session with different prefix content

### Context Strategy Runs Before the API Call

`ContextStrategy.prepare()` receives the full prefix and history. It can truncate history but **must not** modify the prefix — doing so would break the cache.

### Repair Runs After the API Call

`RepairStrategy.repair()` fixes malformed tool calls before they're executed or returned to the user. It runs after the model response but before the agent loop processes tool calls.
