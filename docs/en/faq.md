# Frequently Asked Questions

## General

### What is Halo?

Halo is a Cache-First Agent Framework for building LLM-powered agents. It maximizes prefix caching to reduce latency and cost for multi-turn AI conversations.

### How is Halo different from LangChain or the AI SDK?

Halo's core innovation is the **StablePrefix** architecture — it separates stable prompt content (system prompts, tool definitions) from dynamic conversation history. This split enables automatic, provider-agnostic prefix caching, giving you 70-90% cost reduction on multi-turn conversations without manual cache management.

### Which AI providers does Halo support?

Built-in adapters for **DeepSeek**, with an interface for building custom adapters for OpenAI, Anthropic, Gemini, and any OpenAI-compatible API endpoint.

### Is Halo open source?

Yes. Halo is MIT licensed and [available on GitHub](https://github.com/MapleCity1314/halo-ai).

---

## Getting Started

### What do I need to get started?

- Node.js 18+
- A DeepSeek API key (or other supported provider)
- TypeScript knowledge (JavaScript works too, but type safety adds significant value)

### Can I use Halo without TypeScript?

Yes. While Halo is built with TypeScript and provides excellent type inference, you can use it in plain JavaScript projects. The API is identical.

### How do I install Halo?

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

---

## Caching

### How does prefix caching work?

Halo puts stable content (system prompt + tool definitions + few-shot examples) at position 0 in every API request. Providers with prefix caching (DeepSeek, OpenAI, Anthropic) detect the unchanged prefix and reuse the KV-cache, billing cached tokens at a ~74% discount.

### How much can I save with caching?

Typical multi-turn conversations see **70-90% cost reduction** on input tokens. For a 10-turn conversation with ~2,000 token prefix and ~200 tokens per turn, caching saves ~75% on input costs.

### What breaks the cache?

- Changing the system prompt
- Adding or removing tools
- Adding or removing few-shot examples
- Creating a new agent session with different prefix content

Resetting conversation history (`agent.clearLog()`) does **not** break the cache.

### How can I monitor cache performance?

```ts
console.log(agent.stats.caching);
// { cacheHitRate: 0.8, totalCacheHitTokens: 8000, estimatedSavingsUsd: 0.0016 }
```

---

## Tools & Agents

### How many tools can I define?

No hard limit in Halo. However, each tool's JSON Schema counts toward the prefix token budget. For optimal cache economics, keep total tool definitions under ~5,000 tokens.

### Can I add tools dynamically?

Yes, but each `agent.addTool()` call invalidates the cache for the next turn. For optimal performance, define all tools at agent creation time.

### How does tool calling repair work?

When the model returns malformed JSON for tool arguments (common with truncated responses), `BasicRepair` automatically balances brackets, braces, and quotes to recover the intended structure. You can also implement custom repair strategies.

---

## Deployment

### Can I deploy Halo to serverless?

Yes. Halo works with Vercel, AWS Lambda, Cloudflare Workers, and similar platforms. See [Deploying to Production](/en/guides/deploying).

### Does Halo maintain state between requests?

The agent instance maintains conversation history in memory. For stateless deployments, you'll need to implement session persistence. Halo's `MessageLog.hydrate()` method supports restoring external state.

### How do I handle multiple users?

Create one agent per user session. Each agent maintains its own conversation history and cache state. Use a session store (Redis, database) to persist and restore agent state between requests.

---

## Troubleshooting

### Agent returns empty responses

Check that your API key is set correctly and the model name matches what your provider expects. Enable error logging with the `on` event handler.

### Cache hit rate is lower than expected

Verify that:
- The same agent instance is reused across turns
- Tools are defined once at creation time, not added incrementally
- The system prompt hasn't changed between calls
- The provider supports prefix caching for the model you're using

### Tool calls are failing

Enable the `BasicRepair` strategy to automatically fix malformed tool call arguments. Check that your tool's JSON Schema is valid and matches what the model returns.
