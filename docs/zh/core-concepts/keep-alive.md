# 缓存保活

服务端 KV 缓存有 TTL（生存时间）。如果在 TTL 窗口内没有请求，缓存就会过期。`keepAlive()` 为长时间运行的任务解决这个问题。

## 问题

```ts
await agent.run("开始分析..."); // 缓存是热的
// ... 5 分钟处理（外部 API 调用、数据计算）...
await agent.run("继续分析..."); // 缓存过期——冷启动！
```

## 解决方案

```ts
const keepAlive = agent.keepAlive(); // 每 120 秒 ping 一次（默认）
await agent.run("开始分析...");
// ... 5 分钟处理 ...
await agent.run("继续分析..."); // 缓存仍是热的
keepAlive.stop();
```

## 工作原理

`keepAlive()` 向 API 发送周期性 "ping"：

```
prefix.toMessages() + [{ role: "user", content: "ping" }]
```

由于前缀匹配，DeepSeek 返回缓存命中。ping 的响应被丢弃。这保持了 KV 缓存的活性，而不影响对话历史。

## 自定义间隔

```ts
const keepAlive = agent.keepAlive(30_000); // 每 30 秒
```

## 提供商差异

| 提供商 | 默认 keepAlive | 说明 |
|---|---|---|
| DeepSeek | 周期性 ping（有效） | 前缀匹配保持缓存热度 |
| OpenAI | 周期性 ping（有效） | 自动缓存响应 ping |
| Anthropic | 需要自定义实现 | 需要 `cache_control` 标记 |
| Gemini | 需要自定义实现 | 需要调用 `CachedContents.patch` |
