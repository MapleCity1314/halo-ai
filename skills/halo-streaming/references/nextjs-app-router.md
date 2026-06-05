# Next.js App Router — Streaming Patterns

## Basic Chat Endpoint

```ts
// app/api/chat/route.ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    messages: [{ role: "system", content: "You are helpful." }],
  });

  return agent.streamText(messages).toDataStream();
}
```

## Edge Runtime Configuration

```ts
export const runtime = "edge";
export const maxDuration = 60; // seconds — Vercel Pro/Enterprise

// Use VirtualSandbox for Edge (no child_process):
import { VirtualSandbox } from "@halo-sdk/sandbox";

const sandbox = new VirtualSandbox();
const agent = halo.agent({ messages: [...], tools: sandbox.tools(), sandbox });
```

## Rate Limiting + Authentication

```ts
import { auth } from "@/lib/auth";

export async function POST(req: Request) {
  const session = await auth();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // Rate limit per user
  const { messages } = await req.json();
  // ...
}
```

## Aborting on Client Disconnect

```ts
export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({ messages: [...] });

  const response = agent.streamText(messages).toDataStream();

  // If the client disconnects, the stream is cancelled upstream.
  // Halo does not yet have a built-in abort mechanism — for long research,
  // use maxSteps to prevent runaway loops.

  return response;
}
```

## useChat with Tool Visualization

```tsx
"use client";
import { useChat } from "ai/react";

export default function ChatPage() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
  });

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-xl font-bold mb-4">Chat</h1>

      <div className="space-y-4 mb-6">
        {messages.map((m) => (
          <div key={m.id} className={`p-4 rounded-lg ${m.role === "user" ? "bg-blue-50 ml-12" : "bg-gray-50 mr-12"}`}>
            <div className="prose prose-sm">{m.content}</div>

            {m.toolInvocations?.map((tool) => (
              <div key={tool.toolCallId} className="mt-2 p-2 bg-amber-50 rounded text-xs">
                <span className="font-mono font-semibold">🔧 {tool.toolName}</span>
                {tool.state === "result" && (
                  <span className="ml-2 text-green-600">✓</span>
                )}
                {tool.state === "call" && (
                  <span className="ml-2 animate-pulse">…</span>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Type a message..."
          className="flex-1 p-3 border rounded-lg"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading} className="px-6 py-3 bg-black text-white rounded-lg disabled:opacity-50">
          Send
        </button>
      </form>
    </div>
  );
}
```

## Multiple Agents Per Route

For routes that need different agent configurations per request:

```ts
const baseAgent = halo.agent({
  messages: [{ role: "system", content: "Default assistant." }],
});

const researchAgent = halo.agent({
  messages: [{ role: "system", content: "Research assistant." }],
  tools: mcpTools,
  skills: researchSkills,
});

export async function POST(req: Request) {
  const { messages, mode } = await req.json();

  const agent = mode === "research" ? researchAgent : baseAgent;

  // Important: clear conversation state between requests
  agent.clearLog();

  return agent.streamText(messages).toDataStream();
}
```

**Warning:** Reusing agent instances across requests shares `MessageLog`. Always call `clearLog()` between requests, or create a fresh agent per request.
