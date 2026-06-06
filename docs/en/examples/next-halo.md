# Next.js Chat Example

A complete chat application with Halo, DeepSeek, and Next.js App Router — **modular agent/tool/route architecture**.

> 📂 Source: [`examples/next-halo/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/next-halo)

## Overview

This example demonstrates:

- **Modular design**: Agent, tool, and route in separate files — tools reusable across agents
- **Cache-First streaming**: System prompt + tool specs cached via `StablePrefix`
- **Tool auto-execute**: `streamText` with full tool-call loop
- **useChat integration**: Vercel AI SDK compatible via `toDataStream()`

## Project Structure

```
examples/next-halo/
  agent/
    weather-agent.ts     # Halo factory + agent definition
  tool/
    weather-tool.ts      # Weather tool (typed spec + execute)
  app/
    api/chat/
      route.ts           # Thin handler — parse, streamText, toDataStream
    layout.tsx           # Root layout with Tailwind dark theme
    page.tsx             # Chat page shell
  components/
    chat.tsx             # useChat hook + message bubbles + tool badges
  .env.local.example     # DEEPSEEK_API_KEY=xxx
```

## Tool

```ts
// tool/weather-tool.ts
import { tool } from "@halo-sdk/core";

export const weatherTool = tool<{ city: string }>({
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
});
```

## Agent

```ts
// agent/weather-agent.ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { weatherTool } from "@/tool/weather-tool";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

export function createWeatherAgent() {
  return halo.agent({
    messages: [{ role: "system", content: "You are a helpful weather assistant." }],
    tools: { get_weather: weatherTool },
    model: { temperature: 0.7 },
  });
}
```

## Route Handler — streamText (preferred API)

```ts
// app/api/chat/route.ts
import { createWeatherAgent } from "@/agent/weather-agent";

export async function POST(req: Request) {
  const { messages } = await req.json();

  const agent = createWeatherAgent();

  return agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) => console.log(`Done: ${steps} steps`),
    })
    .toDataStream();
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
