# DeepSeek Adapter

## Model IDs

Always fetch current model IDs — never use IDs from memory:

```bash
curl -s https://api.deepseek.com/v1/models \
  -H "Authorization: Bearer $DEEPSEEK_API_KEY" \
  | jq -r '.data[].id'
```

Common models (verify against API — these may change):
- `deepseek-v4-flash` — fast, default
- `deepseek-v4-pro` — most capable
- `deepseek-chat` — legacy alias

## Configuration

```ts
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const adapter = new DeepSeekAdapter({
  apiKey: process.env.DEEPSEEK_API_KEY!,
  model: "deepseek-v4-pro",               // optional, defaults to deepseek-v4-flash
  baseUrl: "https://api.deepseek.com",    // optional, for proxies or self-hosted
});
```

## Pricing (USD per 1K tokens)

Built into the adapter — used for cost estimation in `agent.stats.caching.estimatedSavingsUsd`:

```
inputPricePer1k:        0.00027
cachedInputPricePer1k:  0.00007   (~74% cheaper on cache hit)
```

## Prefix Caching Behavior

DeepSeek caches the prompt prefix server-side using KV cache. The key conditions:

1. Cache hits only when the prefix bytes are **identical** (including tools, system prompt, few-shots).
2. Cache TTL is approximately **5 minutes**. Use `agent.keepAlive()` for long-running sessions.
3. First request after session start is always a cache miss (cold start).
4. Adding/removing tools triggers exactly one miss — then the new prefix is cached.

## Streaming

Streaming responses use SSE. The adapter handles:
- Text delta accumulation
- Tool-call delta accumulation (name + arguments arrive in chunks)
- Tool-call-ready emission when a complete tool call is assembled
- Usage chunk detection (DeepSeek sends usage in a final SSE frame)

## Error Handling

The adapter throws on non-2xx responses with the body as the error message:

```
DeepSeek 401: {"error":{"message":"Invalid API key"}}
DeepSeek 429: {"error":{"message":"Rate limit exceeded"}}
```

Wrap agent calls in try/catch for production:

```ts
try {
  const result = await agent.generateText(input);
} catch (err) {
  if (err.message.includes("401")) { /* auth issue */ }
  else if (err.message.includes("429")) { /* rate limit, retry */ }
  else { throw err; }
}
```
