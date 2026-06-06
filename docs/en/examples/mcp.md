# MCP Integration

Connect an MCP (Model Context Protocol) server to Halo — bridge external tools into a cache-first agent.

> 📂 Source: [`examples/mcp/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/mcp)

## Architecture

```
MCP Server (stdio)          Halo Agent
┌──────────────────┐       ┌─────────────────────────┐
│ get-pokemon      │       │ StablePrefix (cached)    │
│ (Pokemon API)    │──►    │  ├─ system prompt         │
└──────────────────┘       │  └─ get-pokemon spec      │
                           │ MessageLog (uncached)     │
                           │  └─ conversation           │
                           └─────────────────────────┘
```

- **MCP → ToolDefinition**: `createMCPServer().tools()` converts MCP tools to auto-execute `ToolDefinition`
- **StablePrefix**: MCP tool specs enter the prefix — cached by DeepSeek
- **Auto-execute**: Tools run automatically via the bridged `execute` handlers

## Code

### MCP Server (Pokemon API)

```ts
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "pokemon-mcp", version: "1.0.0" });

server.tool(
  "get-pokemon",
  "Get Pokemon details by name",
  { name: z.string() },
  async ({ name }) => {
    const pokemon = await fetchPokemon(name);
    return { content: [{ type: "text", text: formatPokemon(pokemon) }] };
  },
);

const transport = new StdioServerTransport();
await server.connect(transport);
```

### Halo Client

```ts
// src/client.ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

const mcp = await createMCPServer({
  transport: {
    type: "stdio",
    command: "node",
    args: ["src/dist/server.js"],
  },
});

const mcpTools = await mcp.tools();

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You are a Pokemon expert. Use get-pokemon." }],
  tools: mcpTools, // MCP tools enter StablePrefix → cached!
});

const stream = agent.streamText("Which Pokemon could best defeat Feebas?", { maxSteps: 5 });

for await (const chunk of stream.toAsyncIterable()) {
  if (chunk.type === "text-delta") process.stdout.write(chunk.delta);
}
```

## Running

```bash
cd examples/mcp
cp .env.example .env
pnpm install && pnpm build

# Build MCP server
pnpm server:build

# Run client (spawns MCP server automatically via stdio)
pnpm client
```
