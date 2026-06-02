# Halo AI SDK

**Cache-First AI SDK for DeepSeek.** General-purpose agent framework with automatic prefix caching, built-in tool execution loops, and streaming support.

## Quick Start

```bash
pnpm add @halo-ai/core @halo-ai/adapters
```

```typescript
import { Halo, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const session = halo.session({
  system: "You are a helpful assistant.",
  tools: {
    get_weather: tool({
      description: "Get the weather for a city",
      parameters: {
        type: "object",
        properties: { city: { type: "string" } },
        required: ["city"],
      },
      execute: async ({ city }) => `Sunny, 22°C in ${city}`,
    }),
  },
});

const result = await session.run("What's the weather in Paris?");
// tool is auto-executed — no onToolCall needed!

console.log(result.content);
```

## Packages

| Package | Description |
|---|---|
| `@halo-ai/core` | Core types, `Halo` factory, `HaloSession`, `StablePrefix`, `MessageLog` |
| `@halo-ai/adapters` | Model adapters (`DeepSeekAdapter`) |
| `@halo-ai/stream` | Streaming utilities (`toDataStream`, `createHaloStream`) |
| `@halo-ai/strategies` | Context, repair, and confirmation strategies |

## Key Features

- **Cache-first**: Stable prefix management with SHA-256 fingerprinting to maximize DeepSeek prefix cache hits. `keepAlive()` maintains server-side KV cache warmth during long-running tasks.
- **Automatic tool loops**: `session.run()` handles the model → tool → result → model cycle automatically.
- **Human-in-the-loop**: `session.send()` + `session.submitToolResult()` for manual control.
- **Streaming**: SSE-compatible streaming via `toDataStream()` (Vercel AI SDK protocol).

## Development

```bash
# Install
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Lint & format
pnpm run lint
pnpm run format
```

## License

MIT
