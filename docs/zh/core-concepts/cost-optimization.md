# 成本优化

使用 Halo 最小化 Token 成本的策略。

## 理解缓存经济学

| Token 类型 | DeepSeek 价格 (每百万) | 适用场景 |
|---|---|---|
| 输入 (全价) | $0.27 | 首次调用，或 prefix 变更时 |
| 输入 (缓存) | $0.07 | Prefix 不变 — **74% 折扣** |
| 输出 | $0.28 | 始终 |

## 最大化缓存命中率

### 1. 保持 Prefix 稳定

```ts
// ✅ 推荐：创建一次，多次复用
const agent = halo.agent({ system: "You are...", tools: { ... } });
for (const task of tasks) {
  await agent.run(task);
  agent.clearLog(); // 重置历史，保留缓存
}

// ❌ 避免：每次重建 agent 会丢失缓存
for (const task of tasks) {
  const agent = halo.agent({ system: "You are..." });
  await agent.run(task);
}
```

### 2. 使用 clearLog() 而非新建 Agent

```ts
// ✅ 保留 prefix 在缓存中
agent.clearLog();

// ❌ 新建 agent = 冷启动 prefix
const newAgent = halo.agent({ system: "You are..." });
```

### 3. 批量定义工具

```ts
// ✅ 一次性定义所有工具
const agent = halo.agent({
  tools: { search, calculate, translate, weather },
});

// ❌ 增量添加工具会触发缓存失效
agent.addTool(weatherTool); // 缓存失效！
```

### 4. 对长任务使用 keepAlive()

```ts
const keepAlive = agent.keepAlive();
await longRunningExternalTask(); // 可能需要数分钟
keepAlive.stop();
// 缓存仍为热状态，下次调用可直接命中
```

## 测量节省量

```ts
const agent = halo.agent({ system: "...", tools: { ... } });

for (let i = 0; i < 10; i++) {
  await agent.run(`Task ${i}`);
}

const stats = agent.stats.caching;
console.log(`缓存命中率: ${((stats?.cacheHitRate ?? 0) * 100).toFixed(1)}%`);
console.log(`命中 Token 数: ${stats?.totalCacheHitTokens}`);
console.log(`未命中 Token 数: ${stats?.totalCacheMissTokens}`);
console.log(`预估节省: $${(stats?.estimatedSavingsUsd ?? 0).toFixed(4)}`);
```

## 生产环境预估

```ts
// Prefix: system prompt + tools = ~2,000 tokens
// 每轮历史: ~200 tokens
// 每轮输出: ~100 tokens

// 10 轮对话，prefix 不变：
// 输入: 10 × 2,000 (缓存) + 10 × 200 (非缓存) = $0.014 + $0.0054 = $0.0194
// 输出: 10 × 100 = 1,000 tokens = $0.00028
// 总计: ~$0.02 / 每 10 轮对话

// 不使用缓存（每次都是冷启动）：
// 输入: 10 × 2,200 = 22,000 tokens = $0.0594
// 总计: ~$0.06 — 成本高 3 倍
```
