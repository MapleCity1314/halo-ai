---
name: halo-mcp
description: Use when bridging MCP (Model Context Protocol) servers into Halo agents. Triggers on: "MCP server", "connect MCP", "mcp tools", "modelcontextprotocol", "stdio transport", "SSE transport", "add external tools to agent", "filesystem MCP", "puppeteer MCP", "multi-MCP agent".
---

# MCP Integration

Connect MCP servers and bridge their tools into Halo agents. The `@halo-sdk/mcp` package wraps `@modelcontextprotocol/sdk` (peer dependency) and converts MCP tools to Halo `ToolDefinition` objects — plug directly into `halo.agent({ tools })`.

## Prerequisites

```bash
pnpm add @halo-sdk/mcp @modelcontextprotocol/sdk
```

`@modelcontextprotocol/sdk` is a peer dependency — you control the version.

## Quick Start

```ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }) });

// Connect to an MCP server
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/tmp/workspace"],
  },
});

// Discover tools and convert to Halo ToolDefinition
const mcpTools = await server.tools();

// Feed into agent — tools enter StablePrefix, get cached
const agent = halo.agent({
  messages: [{ role: "system", content: "You have filesystem access." }],
  tools: mcpTools,  // Record<string, ToolDefinition>
});

const result = await agent.generateText("List the files in /tmp/workspace");

// Clean up
await server.close();
```

## Transport Types

### stdio (local subprocess)

For MCP servers that run as a local command. The SDK spawns a child process and communicates over stdin/stdout.

```ts
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/data"],
    env: { NODE_ENV: "production" },   // optional — extra env vars
    cwd: "/path/to/working/dir",        // optional — working directory
  },
});
```

**Use stdio when:** The MCP server is an npm package you can run locally, or a binary on your system.

### SSE (Server-Sent Events, remote)

For MCP servers exposed over HTTP. Uses SSE for server→client and HTTP POST for client→server.

```ts
const server = await createMCPServer({
  transport: {
    type: "sse",
    url: "https://mcp.example.com/sse",
    headers: { Authorization: "Bearer token" },  // optional
  },
});
```

**Use SSE when:** The MCP server is hosted remotely (cloud, internal service) and you don't want to manage a subprocess.

## Tools Bridge

`server.tools()` calls `client.listTools()` and wraps each MCP tool:

```ts
const tools = await server.tools();
// Returns: Record<string, ToolDefinition>
//
// Each tool's `execute` delegates to `client.callTool({ name, arguments })`.
// Results are extracted from the MCP content array (text parts joined by newline).
```

The returned tools can be:
- Passed directly to `halo.agent({ tools })`
- Spread with other tools: `tools: { ...mcpTools, ...myCustomTools }`
- Combined from multiple MCP servers: `tools: { ...serverATools, ...serverBTools }`

## Multi-MCP Agent

Connect multiple MCP servers and feed all tools into one agent:

```ts
const webServer = await createMCPServer({
  transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-puppeteer"] },
});
const fsServer = await createMCPServer({
  transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-filesystem", "/tmp"] },
});

const webTools = await webServer.tools();
const fsTools = await fsServer.tools();

const agent = halo.agent({
  messages: [{ role: "system", content: "You can search the web and read/write files." }],
  tools: { ...webTools, ...fsTools },
});

try {
  await agent.generateText("Search for Halo SDK docs and save findings to /tmp/research.md");
} finally {
  await webServer.close();
  await fsServer.close();
}
```

**Warning:** If two MCP servers expose tools with the same name, the later one wins (standard object spread behavior). Check for collisions before combining.

## Resource and Prompt Slots

Beyond tools, MCP servers can expose resources and prompts. These are available as optional slots on the connection:

```ts
const resources = await server.listResources();
// { resources: [{ uri, name, description?, mimeType? }], nextCursor? }

const content = await server.readResource("file:///data/config.json");
// { contents: [{ uri, mimeType?, text?, blob? }] }

const prompts = await server.listPrompts();
// { prompts: [{ name, description?, arguments? }], nextCursor? }

const prompt = await server.getPrompt("code-review", { language: "typescript" });
// { messages: [{ role: "user" | "assistant", content: "..." }] }
```

These are not automatically exposed to the agent — use them in your application logic.

## Lifecycle Management

Always close connections when done. Use `try/finally` to prevent subprocess leaks:

```ts
const server = await createMCPServer({ transport: { ... } });
try {
  const tools = await server.tools();
  const agent = halo.agent({ messages: [...], tools });
  await agent.generateText("...");
} finally {
  await server.close();
}
```

With TypeScript 5.2+, you can use `using` for auto-disposal:

```ts
{
  await using server = await createMCPServer({ transport: { ... } });
  const tools = await server.tools();
  // ...
} // server.close() called automatically
```

## Server Metadata

```ts
console.log(server.serverInfo);   // { name: "mcp-server", version: "1.0.0" }
console.log(server.instructions); // Optional usage instructions from the server
```

## Error Handling

| Error | Cause | Fix |
|-------|-------|-----|
| `Failed to import @modelcontextprotocol/sdk` | Peer dependency not installed | `pnpm add @modelcontextprotocol/sdk` |
| `Failed to import StdioClientTransport` | SDK version too old | Requires `@modelcontextprotocol/sdk >= 1.0` |
| Subprocess exits unexpectedly | Server crashed or wrong command | Check the command and args, look at stderr |
| `tools()` returns empty | Server has no tools, or initialize failed | Check `server.instructions` for hints |
| Connection timeout | Network issue (SSE) or slow startup (stdio) | Increase timeout, check firewall |
| Tool execution fails | MCP server error | The error is returned as tool output string |

## Subprocess Leak Prevention

MCP stdio servers spawn child processes. If `close()` is not called:

- The child process stays alive (zombie process)
- File descriptors leak
- Port conflicts on restart

Always call `close()` in a `finally` block. In serverless environments (Lambda, Edge), prefer SSE transport to avoid subprocess management.

For detailed transport configuration examples, see `references/transport-examples.md`.
