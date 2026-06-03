---
layout: home
title: Halo AI SDK
hero:
  name: Halo AI SDK
  text: Cache-First Agent Framework
  tagline: Build AI agents with automatic prefix caching across multiple model providers. DeepSeek, OpenAI, Anthropic, Gemini — one API surface.
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started/installation
    - theme: alt
      text: View on GitHub
      link: https://github.com
  image:
    src: /logo.svg
    alt: Halo

features:
  - icon: ⚡
    title: Cache-First
    details: Stable prefix management ensures ~99% cache hit rates. System prompts and tool definitions never leave the cache — only conversation turns are transmitted.
  - icon: 🔄
    title: Auto Agent Loop
    details: agent.run() handles the full model→tool→result→model cycle automatically. Define tools with execute() and the agent runs them without manual intervention.
  - icon: 🌐
    title: Multi-Provider
    details: One agent, any provider. Switch from DeepSeek to OpenAI to Anthropic by changing a single adapter. Each provider's caching strategy is handled transparently.
  - icon: 📡
    title: Streaming First
    details: Built-in SSE streaming via toDataStream(). Compatible with Vercel AI SDK's useChat hook out of the box. No protocol bridging required.
  - icon: 🛡️
    title: Production Ready
    details: keepAlive() maintains server-side KV cache warmth during long-running tasks. Session stats track cache hits, misses, and estimated cost savings.
  - icon: 🔌
    title: Extensible
    details: Pluggable strategies for context management, tool-call repair, and tool confirmation. Custom adapters for any provider in ~30 lines.

---

<div style="max-width: 640px; margin: 48px auto;">

## Quick Start

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

```ts
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  system: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get current weather",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `${city}: 22°C, sunny`,
    }),
  },
});

// Agent loop: auto-executes tools
const result = await agent.run("What's the weather in Paris?");
console.log(result.content);
```

</div>
