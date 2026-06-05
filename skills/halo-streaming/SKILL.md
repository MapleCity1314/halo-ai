---
name: halo-streaming
description: Use when integrating Halo agent streaming into web frameworks. Triggers on: "streamText", "toDataStream", "useChat", "streaming agent response", "SSE streaming", "Next.js AI route", "Express streaming", "real-time agent output", "stream tool calls", "AI SDK integration".
---

# Streaming Integration

Halo agents support streaming with full tool-call loop transparency. This skill covers integrating `streamText()` into Next.js, Express, and custom HTTP servers.

## Quick Comparison

| Method | Tool loop | Callbacks | Consumption paths | Use case |
|--------|-----------|-----------|-------------------|----------|
| `agent.stream()` | No | None | `for await` | Simple text streaming |
| `agent.streamText()` | Yes | `onChunk`, `onStepFinish`, `onFinish`, `onError` | `.toDataStream()`, `.toReadableStream()`, `.toAsyncIterable()`, `.text`, `.usage` | Production agents with tools |
| `agent.sdkStream()` | Auto if `execute` present | None | `for await` | Legacy — use `streamText` instead |

**Always prefer `streamText()` for new code.** It's the only streaming method with full tool-loop support and multiple consumption paths.

## Next.js App Router

### API Route: `app/api/chat/route.ts`

```ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: { role: string; content: string }[] };

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are a helpful assistant." }],
    model: { temperature: 0.7 },
  });

  // streamText accepts ChatMessage[] — hydrates prior history automatically
  return agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ text, usage, steps }) => {
        console.log(`Done: ${steps} steps, ${usage.promptTokens} tokens`);
      },
      onError: (err) => console.error("Stream error:", err),
    })
    .toDataStream();
}
```

### Client: `useChat` from AI SDK

```tsx
"use client";
import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
          <div className="prose">{m.content}</div>
          {/* Tool invocations are automatically rendered by useChat */}
          {m.toolInvocations?.map((t) => (
            <div key={t.toolCallId} className="text-xs text-gray-500">
              🔧 {t.toolName} {t.state === "result" ? "✓" : "…"}
            </div>
          ))}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Ask something..." />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
}
```

### Full Example with Tools + Skills

```ts
// app/api/chat/route.ts
import { Halo, discoverSkills } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const skills = await discoverSkills({ directories: ["skills"] });

const mcp = await createMCPServer({
  transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-puppeteer"] },
});
const mcpTools = await mcp.tools();

export async function POST(req: Request) {
  const { messages } = (await req.json()) as { messages: { role: string; content: string }[] };

  const agent = halo.agent({
    messages: [{ role: "system", content: "Research assistant with web access." }],
    tools: mcpTools,
    skills,
    model: { temperature: 0.3 },
  });

  return agent
    .streamText(messages, {
      maxSteps: 15,
      onChunk: ({ chunk }) => {
        if (chunk.type === "tool-call-ready") {
          console.log(`Tool called: ${chunk.call.function.name}`);
        }
      },
      onStepFinish: ({ step, toolCalls, usage }) => {
        console.log(`Step ${step}: ${toolCalls.length} tools, ${usage.promptTokens} tokens`);
      },
      onFinish: ({ steps, usage }) => {
        console.log(`Complete: ${steps} steps, ${usage.promptTokens}+${usage.completionTokens} tokens`);
      },
      onError: (err) => console.error("Stream error:", err.message),
    })
    .toDataStream();
}
```

## Express / Node.js HTTP Server

```ts
import express from "express";
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const app = express();
app.use(express.json());

app.post("/api/chat", async (req, res) => {
  const { messages } = req.body;

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
  });

  // Option A: SSE via toDataStream
  const response = agent
    .streamText(messages, { maxSteps: 10 })
    .toDataStream();

  // Copy headers and pipe body
  response.headers.forEach((value, key) => res.setHeader(key, value));
  res.status(response.status);
  const reader = response.body!.getReader();

  while (true) {
    const { done, value } = await reader.read();
    if (done) { res.end(); break; }
    res.write(value);
  }
});

app.listen(3000);
```

## Custom SSE Format

`toDataStream()` uses the Vercel AI SDK protocol:

```
0:"Hello"           — text delta (prefix: 0)
9:[{...}]           — tool call delta/ready (prefix: 9)
d:{"usage":{...}}   — done with usage (prefix: d)
```

For custom SSE formats, consume via `toAsyncIterable()`:

```ts
const stream = agent.streamText(input);

// Custom SSE handler
res.writeHead(200, {
  "Content-Type": "text/event-stream",
  "Cache-Control": "no-cache",
  Connection: "keep-alive",
});

for await (const chunk of stream.toAsyncIterable()) {
  switch (chunk.type) {
    case "text-delta":
      res.write(`event: text\ndata: ${JSON.stringify(chunk.delta)}\n\n`);
      break;
    case "tool-call-ready":
      res.write(`event: tool\ndata: ${JSON.stringify({ name: chunk.call.function.name })}\n\n`);
      break;
    case "done":
      res.write(`event: done\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
      break;
  }
}
res.end();
```

## Post-hoc Hooks

`StreamTextResult` supports adding listeners after creation:

```ts
const stream = agent.streamText(input);

stream.on("text-delta", (payload) => {
  // payload: { type: "text-delta", delta: string }
});

stream.on("tool-call-ready", (payload) => {
  // payload: { type: "tool-call-ready", index: number, call: ToolCall }
  // Trigger external side effects (logging, analytics, notifications)
});

stream.on("done", (payload) => {
  // payload: { type: "done", usage: Usage }
});

// Returns an unsubscribe function:
const unsub = stream.on("tool-call-ready", handler);
unsub();
```

## Streaming Large Responses

For long-running research agents that produce many intermediate tool calls:

```ts
const stream = agent.streamText(input, {
  maxSteps: 20,
  onStepFinish: ({ step, text, usage }) => {
    // Log progress without blocking the stream
    console.log(`Step ${step}: ${usage.promptTokens} tokens`);
  },
  onError: (err) => {
    // Handle gracefully — stream may continue after tool execution errors
    console.error(`Step error: ${err.message}`);
  },
});

// The stream continues until:
// - No more tool calls (natural end)
// - maxSteps reached
// - Unrecoverable error (network failure, adapter crash)
```

## Common Patterns

See `references/nextjs-app-router.md` for detailed Next.js integration with edge cases.

See `references/express.md` for Express-specific patterns with middleware and error handling.
