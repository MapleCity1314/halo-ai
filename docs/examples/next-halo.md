# Next.js Chat Example

A complete chat application with Halo, DeepSeek, and Next.js App Router.

## Overview

This example demonstrates:

- **Cache-First streaming**: System prompt cached via DeepSeek prefix caching
- **Tool calling**: Weather lookup with auto-execute
- **useChat integration**: Vercel AI SDK compatible via `toDataStream()`
- **Tool visualization**: UI badges for tool invocations

## Project Structure

```
examples/next-halo/
  app/
    layout.tsx           # Root layout with Tailwind dark theme
    page.tsx             # Chat page shell
    globals.css          # Tailwind directives
    api/chat/
      route.ts           # POST handler — agent.sdkStream() + toDataStream()
  components/
    chat.tsx             # useChat hook + message bubbles + input form
  .env.local.example     # DEEPSEEK_API_KEY=xxx
```

## Route Handler

```ts
// app/api/chat/route.ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = halo.agent({
    system: "You are a helpful weather assistant.",
    tools: {
      get_weather: tool({
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: { city: { type: "string" } },
          required: ["city"],
        },
        execute: async ({ city }) => {
          const data: Record<string, string> = {
            beijing: "5°C, clear",
            tokyo: "8°C, light rain",
            paris: "11°C, partly cloudy",
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

```tsx
// components/chat.tsx
"use client";
import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status } = useChat();

  return (
    <div>
      {messages.map((m) => (
        <div key={m.id}>
          {/* Tool invocations */}
          {m.parts?.map((part, i) =>
            part.type === "tool-invocation" ? (
              <div key={i}>
                {part.toolInvocation.toolName}: {part.toolInvocation.result}
              </div>
            ) : null
          )}
          {/* Text content */}
          {m.content && <p>{m.content}</p>}
        </div>
      ))}
      <form onSubmit={handleSubmit}>
        <input value={input} onChange={handleInputChange} disabled={status !== "ready"} />
        <button type="submit">Send</button>
      </form>
    </div>
  );
}
```

## Running

```bash
cd examples/next-halo
cp .env.local.example .env.local  # add DEEPSEEK_API_KEY
pnpm install
pnpm dev
```

Open `http://localhost:3000` and try asking about weather.
