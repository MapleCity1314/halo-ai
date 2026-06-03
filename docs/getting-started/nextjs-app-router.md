# Next.js App Router

Build a chat application with Next.js App Router, Halo, and the Vercel AI SDK's `useChat` hook.

## Setup

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream @ai-sdk/react
```

## API Route

Create `app/api/chat/route.ts`:

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    system: "You are a helpful assistant.",
    // Optional: tools with auto-execute
    tools: {
      get_weather: tool({
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }: { city: string }) => {
          const data: Record<string, string> = {
            beijing: "5°C, clear",
            paris: "12°C, cloudy",
          };
          return data[city.toLowerCase()] ?? `${city}: 20°C, sunny`;
        },
      }),
    },
  });

  return toDataStream(agent.sdkStream(messages));
}
```

## Chat Component

Create `components/chat.tsx`:

```tsx
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  return (
    <div>
      <div>
        {messages.map((m) => (
          <div key={m.id} className={m.role === "user" ? "user" : "assistant"}>
            {m.content}
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} placeholder="Type a message..." />
        <button type="submit" disabled={status !== "ready"}>Send</button>
      </form>
    </div>
  );
}
```

## How It Works

1. `useChat` sends all messages to `/api/chat` on each submit
2. `agent.sdkStream(messages)` converts UIMessages, hydrates prior history, and streams the response
3. `toDataStream()` wraps the stream in Vercel AI SDK's SSE protocol (`0:`/`d:`)
4. `useChat` automatically parses the SSE stream and updates the UI

::: tip Cache First
The system prompt and tool definitions are part of the **stable prefix**. DeepSeek caches them automatically. Only the conversation turns change between requests — your prefix tokens are billed at ~74% discount.
:::

## Full Example

See the [Next.js example](/examples/next-halo) for a complete chat app with Tailwind styling and tool-call visualization.
