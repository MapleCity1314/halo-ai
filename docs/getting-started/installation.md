# Installation

## Prerequisites

- Node.js 18+
- pnpm (recommended), npm, or yarn

## Install

```bash
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream
```

Optional strategies package:

```bash
pnpm add @halo-ai/strategies
```

## Environment Variables

Create a `.env.local` file:

```bash
# DeepSeek (primary)
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# For other providers when their adapters are available:
# OPENAI_API_KEY=sk-...
# ANTHROPIC_API_KEY=sk-ant-...
```

## Verify Installation

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

const agent = halo.agent({
  system: "You are a helpful assistant.",
});

const result = await agent.send("Hello!");
console.log(result.content); // "Hello! How can I help you today?"
```

## Next Steps

<div class="gs-grid">

<div class="gs-card">

### [Next.js App Router →](/getting-started/nextjs-app-router)
Build a chat app with App Router + `useChat`.

</div>

<div class="gs-card">

### [Node.js →](/getting-started/nodejs)
Use Halo in a Node.js server or CLI script.

</div>

</div>
