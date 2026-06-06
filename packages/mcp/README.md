# @halo-sdk/mcp

MCP (Model Context Protocol) integration for Halo AI SDK — connect to MCP servers and bridge their tools into Halo agents.

## Installation

```bash
npm install @halo-sdk/mcp @modelcontextprotocol/sdk
```

`@modelcontextprotocol/sdk` is a peer dependency — you control the version.

## Quick Start

```ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

const halo = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
});

// Connect to a local MCP server
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/tmp/workspace"],
  },
});

// Discover tools — they become Halo ToolDefinition objects
const tools = await server.tools();

const agent = halo.agent({
  messages: [{ role: "system", content: "You have filesystem access." }],
  tools, // MCP tools enter StablePrefix (cached)
});

await agent.generateText("List files in /tmp/workspace");
await server.close();
```

## Transport Types

### stdio (local subprocess)

```ts
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/data"],
    env: { NODE_ENV: "production" },
    cwd: "/path/to/dir",
  },
});
```

### SSE (remote HTTP)

```ts
const server = await createMCPServer({
  transport: {
    type: "sse",
    url: "https://mcp.example.com/sse",
    headers: { Authorization: "Bearer token" },
  },
});
```

## Multi-MCP Agent

```ts
const webServer = await createMCPServer({
  transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-puppeteer"] },
});
const fsServer = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/tmp"],
  },
});

const agent = halo.agent({
  messages: [{ role: "system", content: "Web search + file access." }],
  tools: { ...(await webServer.tools()), ...(await fsServer.tools()) },
});
```

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/) for full guides and API reference.
