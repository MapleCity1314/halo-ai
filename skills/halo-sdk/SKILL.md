---
name: halo-sdk
description: Use when building AI agents with the Halo SDK. Triggers on: "Halo", "HaloAgent", "halo-sdk", "stable prefix", "cache-first agent", "DeepSeek agent", "build an agent with DeepSeek", "tool calling agent", "agent with prefix caching". Covers agent construction, tool system, streaming, custom adapters, prefix caching, context strategies, object generation, and repair strategies.
---

# Halo SDK

## Prerequisites

Before writing any Halo code, check that the packages are installed:

```bash
# Check package.json for @halo-sdk dependencies
grep "@halo-sdk" package.json
```

If missing, install:

```bash
pnpm add @halo-sdk/core @halo-sdk/adapters
```

**Critical: Do NOT trust internal knowledge about Halo APIs.** Your training data may contain outdated patterns. Always verify against the source code in `packages/core/src/` and `packages/adapters/src/`. When in doubt, read the actual TypeScript interfaces.

## Architecture Overview

Halo SDK uses a **cache-first** design with two separated message layers:

```
Halo (factory, holds ModelAdapter)
  └─ HaloAgent (per-conversation agent)
       ├─ StablePrefix   ← CACHED: system prompt + tools + few-shots. Fingerprinted SHA-256.
       ├─ MessageLog     ← UNCACHED: user/assistant/tool messages. Truncatable.
       ├─ ToolExecutors  ← Map<name, execute>. Auto-runs on tool calls.
       └─ ModelAdapter   ← DeepSeek by default. Replaceable.
```

**The key invariant:** `StablePrefix` changes trigger exactly one cache miss. `MessageLog` changes never affect caching. Keep this separation in mind when designing agents.

## Quick Start

```ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-v4-pro",  // optional, defaults to deepseek-v4-flash
  }),
});

const agent = halo.agent({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
  ],
  model: { temperature: 0.7, maxTokens: 4096 },
});

const result = await agent.generateText("What is prefix caching?");
console.log(result.content);
console.log(result.usage);  // { promptTokens, completionTokens, caching? }
```

## Agent Construction

### messages (preferred)

Pass all prefix content as `ChatMessage[]`. The first `role: "system"` message defines the system prompt. Remaining messages act as few-shot examples. All of this enters `StablePrefix` and is cached.

```ts
const agent = halo.agent({
  messages: [
    { role: "system", content: "You are a code reviewer..." },
    { role: "user", content: "Review this: function add(a,b){return a+b}" },
    { role: "assistant", content: "Missing types and return statement is implicit." },
  ],
});
```

### Legacy: system + fewShots (deprecated)

`system` and `fewShots` still work but are deprecated. Cannot be mixed with `messages`. Prefer `messages` for clarity.

### model (does NOT enter prefix)

`model` sets agent-level defaults for temperature, topP, maxTokens, etc. It is stored outside `StablePrefix` — changing it does NOT trigger a cache miss. Can be overridden per-request:

```ts
const agent = halo.agent({
  messages: [...],
  model: { temperature: 0.7 },
});

// Per-request override — higher priority than agent-level model
await agent.generateText("hello", { temperature: 0.1 });
```

### tools

Accepts `ToolSpec[]` (flat array) or `Record<string, ToolDefinition>` (named record with optional `execute`).

```ts
// Option A: ToolSpec[] (no auto-execute)
const agent = halo.agent({
  tools: [{ type: "function", function: { name: "weather", description: "...", parameters: {...} } }],
});

// Option B: Record<string, ToolDefinition> (with auto-execute)
import { tool } from "@halo-sdk/core";

const agent = halo.agent({
  tools: {
    weather: {
      description: "Get weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `Sunny, 22°C in ${city}`,
    },
  },
});
```

When `execute` is provided, `generateText()` and `streamText()` run it automatically — no `onToolCall` callback needed.

The `tool()` helper provides type inference for `TArgs`:

```ts
const weather = tool<{ city: string }>({
  description: "Get weather",
  parameters: { ... },
  execute: async ({ city }) => `${city}: sunny, 22°C`,
});
// weather is typed as ToolDefinition<{ city: string }>
```

### skills

Agent Skills follow the [agentskills.io](https://agentskills.io) progressive disclosure pattern. Name + description enter `StablePrefix` (cached). The body is loaded at runtime via an auto-registered `loadSkill` tool (uncached).

```ts
import { discoverSkills } from "@halo-sdk/core";

const skills = await discoverSkills({
  directories: [".halo/skills", "skills"],
});

const agent = halo.agent({ messages, tools, skills });
```

**Important:** `loadSkill` is a reserved tool name. If your tools include `loadSkill`, the agent will throw on construction.

### sandbox

Optional filesystem + command execution environment. Does NOT enter `StablePrefix`.

```ts
import { ContainerSandbox } from "@halo-sdk/sandbox";

const sandbox = new ContainerSandbox({ baseDir: "/tmp/work" });
const agent = halo.agent({
  messages,
  tools: { ...sandbox.tools(), ...myTools },
  sandbox,
});
```

See [halo-sandbox skill](#) and the Sandbox section below.

## Core APIs

### generateText(input, opts?)

Primary non-streaming API with automatic tool-call loop. Returns `TurnResult`.

```ts
const result = await agent.generateText("Research quantum computing", {
  maxSteps: 10,                      // tool loop iteration limit
  temperature: 0.3,                  // per-request override
  onToolCall: async (call) => ({     // manual tool handler (if no execute)
    toolCallId: call.id,
    output: "custom result",
  }),
  onStep: ({ step, content, toolCalls }) => {
    console.log(`Step ${step}: ${toolCalls.length} tool calls`);
  },
});

// result: { content: string, toolCalls: ToolCall[], usage: Usage }
```

**Tool loop behavior:**
1. Send user input → model responds with text + optional tool calls
2. For each tool call with an `execute` function, run it automatically
3. If `onToolCall` is provided and no `execute`, call `onToolCall` instead
4. If neither, stop the loop and return pending tool calls
5. Feed tool results back → model responds again
6. Repeat until no more tool calls or `maxSteps` reached

### send(input) + submitToolResult(result)

Manual control — no automatic tool loop. For when you want to handle tool execution yourself.

```ts
const result = await agent.send("Search for Halo SDK docs");
// result.toolCalls may contain pending tool calls

// After executing tools manually:
await agent.submitToolResult({
  toolCallId: result.toolCalls[0].id,
  output: "Found 3 relevant pages...",
});

// Or with error:
await agent.submitToolResult({
  toolCallId: callId,
  output: "Network timeout",
  isError: true,
});
```

### streamText(input, opts?)

Streaming entry with full tool-call loop. Returns `StreamTextResult` — multiple consumption paths.

```ts
const stream = agent.streamText("Explain cache-first architecture", {
  maxSteps: 5,

  // Callbacks:
  onChunk: ({ chunk }) => {
    // chunk: { type: "text-delta", delta } | { type: "tool-call-ready", ... } | { type: "done", usage }
  },
  onStepFinish: ({ text, toolCalls, usage, step }) => {
    // Fires after each model response in the tool loop
  },
  onFinish: ({ text, usage, steps, toolCalls }) => {
    // Fires after final step (no more tool calls)
  },
  onError: (error) => {
    // Catches network errors, JSON parse failures, execute exceptions
  },
});

// Consumption paths — pick ONE:
return stream.toDataStream();                           // SSE Response (for AI SDK useChat)
return stream.toReadableStream();                        // ReadableStream<Uint8Array>
for await (const chunk of stream.toAsyncIterable()) {}  // AsyncIterable<TurnChunk>
const text = await stream.text;                         // Promise<string>
const usage = await stream.usage;                       // Promise<Usage>

// Post-hoc hooks:
stream.on("tool-call-ready", (call) => { console.log("Tool called:", call.function.name); });
```

**Input polymorphism:** Pass a string (plain user input) or `ChatMessage[]` (hydrates prior history from AI SDK `useChat` messages, uses the last message as the current turn).

For detailed streaming integration patterns, use the `halo-streaming` skill.

### generateObject(input, opts)

Structured output via `responseFormat`. Schema does NOT enter `StablePrefix`. Tools are suppressed.

```ts
import { z } from "zod";

const { object, usage } = await agent.generateObject("Extract: Alice, 30, engineer", {
  schema: z.object({
    name: z.string(),
    age: z.number(),
    role: z.string(),
  }),
});
// object is typed: { name: string, age: number, role: string }

// Or with plain JSON Schema:
const { object } = await agent.generateObject("...", {
  schema: { type: "object", properties: { name: { type: "string" } } },
});
// object is unknown
```

### streamObject(input, opts)

Streaming variant — yields progressively-built partial objects as JSON accumulates.

```ts
for await (const partial of agent.streamObject("Generate 10 items", {
  schema: z.object({ items: z.array(z.string()) }),
})) {
  console.log(partial); // { items: ["a"] } → { items: ["a", "b"] } → ...
}
```

### generateText (deprecated alias: run())

The old `agent.run()` method is deprecated. Use `agent.generateText()` instead.

## Cache Architecture

### How it works

1. `StablePrefix` computes a SHA-256[:16] fingerprint from `{ system, tools, fewShots }`.
2. On the first request, DeepSeek caches the prefix server-side. Prompt tokens from the prefix are billed at the **cached** rate (~75% cheaper).
3. On subsequent requests with the same fingerprint, the cache hits — only dynamic `MessageLog` tokens are billed at the full rate.
4. Any change to `addTool()`, `removeTool()`, `addFewShot()`, `removeFewShot()`, or `setSystem()` invalidates the fingerprint → triggers one cache miss on the next request. After that, the new prefix is cached again.

### What enters StablePrefix (triggers cache miss on change):

| Data | In prefix? |
|------|-----------|
| `messages` (system + few-shots) | Yes |
| `tools` (name, description, parameters) | Yes |
| `skills` metadata (name + description) | Yes |
| `model.*` (temperature, maxTokens, etc.) | No — safe to change |
| `sandbox` | No — safe to change |
| Per-request `opts` (temperature, seed, etc.) | No — safe to change |
| Tool `execute` functions | No — only spec enters prefix |

### Monitoring cache hits

```ts
agent.stats.caching; // { totalCacheHitTokens, totalCacheMissTokens, cacheHitRate, estimatedSavingsUsd }

// Emitted events:
agent.on("cache:miss", (payload) => {
  console.log("Cache miss:", payload.detail);
});
```

### Keep-alive

DeepSeek server-side KV cache expires after ~5 minutes of inactivity. For long-running sessions, use keep-alive to send periodic pings:

```ts
const { stop } = agent.keepAlive(120_000); // ping every 2 minutes
// ... long task ...
stop(); // clean up
```

### Custom fingerprint hash

```ts
// StablePrefix accepts a custom hash function for testing or deterministic caching:
new HaloAgentImpl({
  adapter,
  messages: [...],
  hashFn: (input) => customHash(input),
});
```

## Custom Adapter

Implement the `ModelAdapter` interface to support any LLM provider:

```ts
import type { ModelAdapter, ModelCapabilities, PricingInfo, ChatParams } from "@halo-sdk/core";

class MyAdapter implements ModelAdapter {
  readonly modelId = "my-model";
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = {
    toolUse: true,
    streaming: true,
  };
  readonly pricing?: PricingInfo = {
    inputPricePer1k: 0.0001,
    cachedInputPricePer1k: 0.000025,
  };

  async chat(params: ChatParams): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }> {
    const { prefix, history, tools, responseFormat, options } = params;
    const messages = [...prefix, ...history];
    // Call your provider's API...
    return { content, toolCalls, usage };
  }

  async *stream(params: ChatParams): AsyncGenerator<TurnChunk> {
    // Yields { type: "text-delta", delta } | { type: "tool-call-ready", ... } | { type: "done", usage }
  }

  keepAlive?(prefix: ChatMessage[]): { stop: () => void } {
    // Optional: provider-specific keep-alive
  }
}
```

**Key rule:** The adapter receives `prefix` and `history` separately — always concatenate them in order (`[...prefix, ...history]`) when sending to the provider. This separation is what enables the caching layer.

If `pricing` is provided, the agent automatically tracks `estimatedSavingsUsd` and cache hit rate. Omit `pricing` if your provider doesn't support caching.

## Custom ContextStrategy

Control how `MessageLog` is truncated when approaching the context window limit. The strategy is read-only on `prefix` — it can only modify `history`:

```ts
import type { ContextStrategy } from "@halo-sdk/core";

class MyTruncateStrategy implements ContextStrategy {
  prepare(prefix: ChatMessage[], history: ChatMessage[], ctxMax: number) {
    // prefix: READ-ONLY. Do not modify.
    // history: you may truncate, summarize, or drop.
    // Return: { history, modified, summary?, droppedCount }

    const prefixTokens = estimateTokens(prefix);
    const budget = ctxMax - prefixTokens;

    if (estimateTokens(history) <= budget) {
      return { history, modified: false, droppedCount: 0 };
    }

    // Drop oldest discardable messages first.
    const kept = history.filter((m, i) => {
      if (m.discardable) return false; // loadSkill results, etc.
      return estimateTokens(history.slice(i)) <= budget;
    });

    return {
      history: kept,
      modified: true,
      droppedCount: history.length - kept.length,
    };
  }
}
```

The built-in `TruncateStrategy` (from `@halo-sdk/strategies`) drops discardable messages first, then oldest messages, respecting a configurable `maxTokens` budget (default: 80% of 128K = 102,400).

## Custom RepairStrategy

Fix malformed tool-call JSON from the model:

```ts
import type { RepairStrategy } from "@halo-sdk/core";

const repair: RepairStrategy = {
  repair(toolCalls: ToolCall[], rawContent: string) {
    const repaired = toolCalls.map(call => {
      try {
        JSON.parse(call.function.arguments);
        return call; // valid — no repair needed
      } catch {
        return {
          ...call,
          function: {
            ...call.function,
            arguments: closeUnbalancedBraces(call.function.arguments),
          },
        };
      }
    });

    return {
      toolCalls: repaired,
      fixed: repaired.filter((c, i) => c !== toolCalls[i]).length,
      suppressed: 0,
      notes: [],
    };
  },
};
```

The built-in `BasicRepair` (from `@halo-sdk/strategies`) fixes truncated JSON by counting unbalanced braces/brackets and closing them.

## Built-in Tools

```ts
import { calculator, datetime } from "@halo-sdk/core";

const agent = halo.agent({
  messages: [...],
  tools: {
    ...calculator(),
    ...datetime(),
  },
});
```

- **calculator** — Safe arithmetic: `+`, `-`, `*`, `/`, `%`, `**`, parentheses, decimals. Whitelist-only, rejects code injection.
- **datetime** — Date/time utilities: `now` (with timezone), `parse` (string → ISO 8601), `convert` (between timezones).

## Agent Lifecycle

```ts
agent.clearLog();        // Reset conversation history, keep prefix
agent.setSystem("...");  // Change system prompt — triggers ONE cache miss
agent.addTool(spec);     // Add tool — triggers ONE cache miss
agent.removeTool(name);  // Remove tool — triggers ONE cache miss
agent.hydrate(messages); // Restore conversation from external history
```

## Reference: Common Patterns

See `references/common-errors.md` for frequently encountered issues.

See `references/prefix-cache.md` for deep-dive on cache optimization.

See `references/deepseek.md` for DeepSeek-specific configuration and model IDs.
