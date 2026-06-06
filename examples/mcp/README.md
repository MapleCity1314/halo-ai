# MCP Integration + Halo

Connect an MCP (Model Context Protocol) server to Halo and bridge its tools into a cache-first agent.

## Architecture

```
 ┌──────────────────────┐     stdio      ┌──────────────────────┐
 │  MCP Server           │ ◄──────────► │  Halo Agent            │
 │  (Pokemon API)         │               │                        │
 │                        │               │  StablePrefix (cached) │
 │  Tool: get-pokemon     │  → tools() →  │  ├─ System prompt       │
 │                        │               │  └─ get-pokemon spec    │
 └──────────────────────┘               │                        │
                                         │  MessageLog (uncached)  │
                                         │  └─ Conversation        │
                                         └──────────────────────┘
```

- **MCP tools → Halo ToolDefinition**: `createMCPServer().tools()` converts MCP tools to auto-execute `ToolDefinition` objects.
- **StablePrefix caching**: MCP tool specs (name, description, parameters) enter the prefix → cached by DeepSeek.
- **Auto-execute**: The agent runs MCP tools automatically via the bridged `execute` handlers.

## Quick Start

```bash
# 1. Install and build
pnpm install
pnpm build

# 2. Set your API key
cp .env.example .env  # add DEEPSEEK_API_KEY

# 3. Build MCP server
pnpm server:build

# 4. Run client (spawns MCP server automatically)
pnpm client
```

## Files

| File            | Purpose                                                           |
| --------------- | ----------------------------------------------------------------- |
| `src/server.ts` | MCP server — Pokemon API via stdio                                |
| `src/client.ts` | Halo client — `createMCPServer`, tools bridge, agent conversation |
| `.env.example`  | Required: `DEEPSEEK_API_KEY`                                      |
