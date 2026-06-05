# Prefix Cache Deep-Dive

## Fingerprint Computation

`StablePrefix` computes a SHA-256 hash (truncated to 16 hex chars) from:

```ts
JSON.stringify({
  system: this._system,        // system prompt string
  tools: this._toolSpecs,      // array of ToolSpec
  shots: this._fewShots,       // array of ChatMessage
})
```

The hash changes when any of these change. The hash is deterministic — same content always produces the same fingerprint.

## Cache Miss Triggers

| Action | Cache miss? |
|--------|------------|
| `new HaloAgent(...)` — first request | Yes (cold start) |
| `agent.addTool(spec)` — next request | Yes (1 miss only) |
| `agent.removeTool(name)` — next request | Yes (1 miss only) |
| `agent.addFewShot(msg)` — next request | Yes (1 miss only) |
| `agent.removeFewShot(idx)` — next request | Yes (1 miss only) |
| `agent.setSystem(text)` — next request | Yes (1 miss only) |
| Change `model.temperature` | **No** |
| Per-request `temperature` override | **No** |
| Change sandbox | **No** |
| `agent.clearLog()` | **No** — only clears MessageLog |

## Optimization Strategies

### 1. Module-level agent reuse

If multiple requests share the same system prompt + tools, reuse a single `HaloAgent` instance:

```ts
// Module-level — created once, reused across requests
const sharedAgent = halo.agent({
  messages: [{ role: "system", content: "You are a code assistant." }],
  tools: { readFile, writeFile },
});

// In request handler:
async function handleRequest(input: string) {
  const result = await sharedAgent.generateText(input);
  sharedAgent.clearLog(); // Reset conversation, keep prefix cache
  return result;
}
```

### 2. Push tool changes to the end

If you need to add or remove tools mid-session, batch the changes:

```ts
// ❌ Bad: 3 separate cache misses
agent.addTool(toolA);
await agent.generateText("...");
agent.addTool(toolB);
await agent.generateText("...");

// ✅ Good: 1 cache miss
agent.addTool(toolA);
agent.addTool(toolB);
await agent.generateText("...");
```

### 3. Prefer separate agents for different tool sets

Instead of adding/removing tools on one agent, create two agents with fixed tool sets:

```ts
const searchAgent = halo.agent({ messages: researchSystem, tools: searchTools });
const codeAgent = halo.agent({ messages: codeSystem, tools: codeTools });
// Each has its own stable prefix — no cache misses from tool changes.
```

### 4. Keep model and sandbox outside prefix

Model config and sandbox are designed to stay out of StablePrefix precisely so you can tune them without cache penalty. Use this:

```ts
// These changes cost ZERO cache misses:
agent.generateText("...", { temperature: 0.3 });  // per-request override
agent.generateText("...", { maxTokens: 2048 });   // per-request override
```

## Diagnosing Cache Misses

```ts
// Event listener:
agent.on("cache:miss", (payload) => {
  console.log("Type:", payload.type);    // "cold-start" | "unknown"
  console.log("Detail:", payload.detail); // "missTokens: 1500"
});

// Stats after turns:
console.log(agent.stats.caching);
// {
//   totalCacheHitTokens: 12000,
//   totalCacheMissTokens: 3000,
//   cacheHitRate: 0.8,
//   estimatedSavingsUsd: 0.0024
// }
```

A healthy session should trend toward >80% cache hit rate after the first 2-3 turns.
