# Halo AI SDK

**Cache-First Agent Framework** — Build AI agents with automatic prefix caching across multiple model providers.

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/halo-sdk/halo-ai
cd halo-ai

# 2. One-command setup
pnpm setup

# 3. Set your API key
cp .env.example .env
# Edit .env → add your DEEPSEEK_API_KEY

# 4. Run tests
pnpm test
```

## Monorepo Scripts

| Command | Description |
|---|---|
| `pnpm setup` | Install deps + build all packages |
| `pnpm build` | Build all packages (turbo) |
| `pnpm test` | Run all tests (turbo) |
| `pnpm dev` | Run dev mode across packages |
| `pnpm docs:dev` | Start docs site (VitePress) |
| `pnpm docs:build` | Build docs for production |
| `pnpm example:dev` | Start Next.js chat example |
| `pnpm lint` | Lint all packages |
| `pnpm format` | Format all packages |
| `pnpm clean` | Clean all build outputs |

## Packages

| Package | Description |
|---|---|
| `@halo-ai/core` | `Halo` factory, `HaloAgent`, `StablePrefix`, `MessageLog`, types |
| `@halo-ai/adapters` | `DeepSeekAdapter` |
| `@halo-ai/stream` | `toDataStream`, `createHaloStream` |
| `@halo-ai/strategies` | `TruncateStrategy`, `BasicRepair` |

## Examples

| Example | Description |
|---|---|
| [`examples/next-halo`](./examples/next-halo) | Next.js App Router chat app with weather tool |

## Documentation

```bash
pnpm docs:dev    # → http://localhost:5173
```

See [docs/](./docs) for the full documentation site source.

## License

MIT
