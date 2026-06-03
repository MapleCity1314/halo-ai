# Cost Optimization

Strategies to minimize token costs with Halo.

## Understanding Cache Economics

| Token Type | DeepSeek Price (per 1M) | When Applied |
|---|---|---|
| Input (full) | $0.27 | First call, or when prefix changes |
| Input (cached) | $0.07 | Prefix unchanged — **74% discount** |
| Output | $0.28 | Always |

## Maximizing Cache Hits

### 1. Keep the Prefix Stable

```ts
// ✅ Good: create once, reuse
const agent = halo.agent({ system: "You are...", tools: { ... } });
for (const task of tasks) {
  await agent.run(task);
  agent.clearLog(); // Reset history, keep cache
}

// ❌ Bad: recreating agent each time loses cache
for (const task of tasks) {
  const agent = halo.agent({ system: "You are..." });
  await agent.run(task);
}
```

### 2. Use clearLog() Instead of New Agents

```ts
// ✅ Keeps prefix in cache
agent.clearLog();

// ❌ New agent = cold prefix
const newAgent = halo.agent({ system: "You are..." });
```

### 3. Batch Tool Definitions

```ts
// ✅ Define all tools upfront
const agent = halo.agent({
  tools: { search, calculate, translate, weather }, // All at once
});

// ❌ Adding tools incrementally triggers cache misses
agent.addTool(weatherTool); // Cache miss!
```

### 4. Use keepAlive() for Long Tasks

```ts
const keepAlive = agent.keepAlive();
await longRunningExternalTask(); // Could be minutes
keepAlive.stop();
// Cache is still warm for the next call
```

## Measuring Savings

```ts
const agent = halo.agent({ system: "...", tools: { ... } });

for (let i = 0; i < 10; i++) {
  await agent.run(`Task ${i}`);
}

const stats = agent.stats.caching;
console.log(`Cache hit rate: ${((stats?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
console.log(`Hit tokens: ${stats?.totalCacheHitTokens}`);
console.log(`Miss tokens: ${stats?.totalCacheMissTokens}`);
console.log(`Estimated savings: $${(stats?.estimatedSavingsUsd ?? 0).toFixed(4)}`);
```

## Estimating Costs Before Production

```ts
// Prefix: system prompt + tools = ~2,000 tokens
// History per turn: ~200 tokens
// Output per turn: ~100 tokens

// 10-turn conversation with stable prefix:
// Input: 10 × 2,000 cached + 10 × 200 uncached = $0.014 + $0.0054 = $0.0194
// Output: 10 × 100 = 1,000 tokens = $0.00028
// Total: ~$0.02 per 10-turn conversation

// Without caching (every call is cold):
// Input: 10 × 2,200 = 22,000 tokens = $0.0594
// Total: ~$0.06 — 3x more
```
