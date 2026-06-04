# Halo AI SDK

<p align="left">
  <a href="https://github.com/halo-sdk/halo-ai/actions"><img src="https://github.com/halo-sdk/halo-ai/workflows/ci/badge.svg" alt="CI Status"></a>
  <a href="https://opensource.org/licenses/MIT"><img src="https://img.shields.io/badge/License-MIT-cc785c.svg" alt="License: MIT"></a>
  <a href="https://www.npmjs.com/package/@halo-sdk/core"><img src="https://img.shields.io/npm/v/@halo-sdk/core.svg?color=5db8a6" alt="NPM Version"></a>
</p>

**Halo** is the first **Cache-First Agent Framework** designed to build production-grade, ultra-low-latency AI agents. By leveraging LLM providers' native prompt caching features (like DeepSeek and Anthropic), Halo achieves up to a **90% reduction in token costs** and an **80% reduction in response latency** (TTFT) during multi-turn agentic loops.

English | [简体中文](./docs/index.md)

---

## 🧠 Why Halo? (The Caching Bottleneck)

Most agent frameworks (like LangChain or LlamaIndex) treat LLM interactions as stateless API calls. In multi-turn agent loops (ReAct, Planning, Reflection), the entire context—including long system guidelines, complex tool schemas, and dialog history—is sent to the model repeatedly. 

This causes two major issues in production:
1. **Redundant Cost**: You pay to re-evaluate the same system prompt and tools on every single turn.
2. **High Latency**: The Time-to-First-Token (TTFT) scales linearly with the size of the history as the model re-processes the prompt.

**Halo fixes this by locking a Stable Prefix.** 

Halo compiles your system prompt, schemas, and stable context into a cacheable prefix. During the agent loop, Halo ensures the prompt structure matches the provider's alignment requirements perfectly, keeping the cache "hot."

---

## ✨ Key Features

- **⚡ Dynamic Prefix Caching**: Automatically compile and maintain the cached prefix across conversation turns, preserving prompt-cache hit rates.
- **🩹 Self-Healing Agent Loops**: Built-in strategy layers intercept failed tool calls (invalid JSON, missing properties) and automatically repair them on the fly.
- **🌊 Native Event Streaming**: Fully stream thinking traces, tool call parameters, execution logs, and text generation to your frontend.
- **🔌 Multi-Model Adapters**: Native adapters for DeepSeek, OpenAI, Anthropic, and other caching-native providers under a single unified SDK.
- **✂️ Precision Context De-noising**: Intelligent sliding-window and token truncation strategies prevent context window overflows while keeping key guidelines cached.

---

## 📦 Monorepo Architecture

Halo is designed following the Unix philosophy—highly cohesive, modular packages:

```
┌────────────────────────────────────────────────────────┐
│                      @halo-sdk/core                     │
│    Factory, Agent Loop, Message Log & Stable Prefix    │
└───────────┬──────────────────────────────┬─────────────┘
            ▼                              ▼
┌───────────────────────┐      ┌─────────────────────────┐
│   @halo-sdk/adapters   │      │   @halo-sdk/strategies   │
│   DeepSeek / Anthropic│      │   Truncate & Self-Repair│
└───────────────────────┘      └─────────────────────────┘
            │                              │
            └──────────────┬───────────────┘
                           ▼
┌────────────────────────────────────────────────────────┐
│                     @halo-sdk/stream                    │
│    Full-Pipeline Stream Event Pipeline (Next.js/etc)   │
└────────────────────────────────────────────────────────┘
```

- **`@halo-sdk/core`**: Core engine managing agent execution, context lifecycles, and stable prefix compilation.
- **`@halo-sdk/adapters`**: Caching-aware adapters converting raw LLM provider payloads to Halo's caching structure.
- **`@halo-sdk/strategies`**: Self-healing strategies (e.g., `BasicRepair` to fix bad model tool calls) and memory rules.
- **`@halo-sdk/stream`**: Dynamic serialization engine to pipe real-time agent execution events to the client.

---

## 🚀 Quick Start

### 1. Installation

```bash
# Clone the repository
git clone https://github.com/halo-sdk/halo-ai
cd halo-ai

# Bootstrap the monorepo (installs dependencies and builds packages)
pnpm setup
```

### 2. Configure Environment

Copy the example environment file and add your provider keys:

```bash
cp .env.example .env
```

Open `.env` and set your key (e.g. `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`).

### 3. Usage Example

Here is how you spin up a cache-first agent using the DeepSeek adapter and tool execution:

```typescript
import { Halo, StablePrefix } from '@halo-sdk/core';
import { deepseek } from '@halo-sdk/adapters';
import { tool } from '@halo-sdk/core'; // Helper to declare tools
import { z } from 'zod';

// 1. Declare tools with strong schemas
const calculateWeather = tool({
  description: 'Get the current weather for a location',
  parameters: z.object({
    city: z.string().describe('The city name'),
  }),
  execute: async ({ city }) => {
    return { temperature: '22°C', condition: 'Sunny' };
  }
});

// 2. Initialize a Cache-First Agent
const agent = new Halo({
  model: deepseek('deepseek-chat'),
  prefix: new StablePrefix({
    system: 'You are a precise weather analyst assistant.',
    tools: { calculateWeather },
  })
});

// 3. Run the Agent loop
const stream = await agent.run({
  prompt: 'What is the weather in Paris, and what should I wear?',
  cache: 'first' // Forces dynamic prefix caching
});

// 4. Consume events (streaming text, tool execution logs, and thinking traces)
for await (const event of stream) {
  if (event.type === 'text-delta') {
    process.stdout.write(event.text);
  } else if (event.type === 'tool-call') {
    console.log(`\n[Executing Tool] ${event.name} with args:`, event.args);
  }
}
```

---

## 🛠️ Monorepo Scripts

We use [Turbo](https://turbo.build/) to manage our workspace build and test pipeline:

| Script | Description |
|---|---|
| `pnpm setup` | Installs all workspace dependencies and builds packages sequentially. |
| `pnpm build` | Compiles all packages in parallel using Turborepo. |
| `pnpm test` | Runs the Vitest test suite across all packages. |
| `pnpm dev` | Starts development watch mode across packages. |
| `pnpm docs:dev` | Launches the redesigned VitePress documentation site locally. |
| `pnpm docs:build` | Compiles the VitePress documentation site for production deployment. |
| `pnpm example:dev` | Launches the Next.js App Router chat example application. |
| `pnpm lint` | Runs eslint and linter checks across all packages. |
| `pnpm format` | Formats all code using prettier/eslint. |
| `pnpm clean` | Cleans up builds, dist folders, and cache artifacts. |

---

## 📖 Documentation

Our documentation site features an elegant, editorial layout powered by VitePress:

- Local preview: `pnpm docs:dev` (runs on `http://localhost:5173`)
- Directory location: [`docs/`](./docs)

Inside the docs, you'll find deep dives into **Context Engineering**, **Multi-Provider Caching Lifecycles**, **Writing Custom Adapters**, and **Self-Healing Agent Loops**.

---

## 📄 License

MIT © [Halo AI SDK Authors](https://github.com/halo-sdk/halo-ai)