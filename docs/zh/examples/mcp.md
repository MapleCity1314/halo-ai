# MCP 集成

将 MCP（Model Context Protocol）服务器连接到 Halo — 把外部工具桥接到 cache-first agent 中。

> 📂 源码: [`examples/mcp/`](https://github.com/halo-sdk/halo-ai/tree/main/examples/mcp)

## 架构

```
MCP Server (stdio)          Halo Agent
┌──────────────────┐       ┌─────────────────────────┐
│ get-pokemon      │       │ StablePrefix (缓存)      │
│ (Pokemon API)    │──►    │  ├─ system prompt         │
└──────────────────┘       │  └─ get-pokemon spec      │
                           │ MessageLog (不缓存)       │
                           │  └─ 对话历史               │
                           └─────────────────────────┘
```

- **MCP → ToolDefinition**: `createMCPServer().tools()` 将 MCP 工具转为自动执行的 `ToolDefinition`
- **StablePrefix**: MCP 工具规格进入 prefix — 被 DeepSeek 缓存
- **自动执行**: 工具通过桥接的 `execute` 处理器自动运行

## 代码

### MCP Server（Pokemon API）

```ts
// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const server = new McpServer({ name: "pokemon-mcp", version: "1.0.0" });

server.tool("get-pokemon", "按名称获取宝可梦详情", { name: z.string() }, async ({ name }) => {
  const pokemon = await fetchPokemon(name);
  return { content: [{ type: "text", text: formatPokemon(pokemon) }] };
});

await server.connect(new StdioServerTransport());
```

### Halo Client

```ts
// src/client.ts
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

const mcp = await createMCPServer({
  transport: { type: "stdio", command: "node", args: ["src/dist/server.js"] },
});

const mcpTools = await mcp.tools();

const agent = new Halo({
  adapter: new DeepSeekAdapter({ apiKey: process.env.DEEPSEEK_API_KEY! }),
}).agent({
  messages: [{ role: "system", content: "你是宝可梦专家，使用 get-pokemon。" }],
  tools: mcpTools, // MCP 工具进入 StablePrefix → 被缓存！
});

const stream = agent.streamText("哪只宝可梦最可能打败丑丑鱼？", { maxSteps: 5 });
for await (const chunk of stream.toAsyncIterable()) {
  if (chunk.type === "text-delta") process.stdout.write(chunk.delta);
}
```

## 运行

```bash
cd examples/mcp
cp .env.example .env
pnpm install && pnpm build

# 编译 MCP server
pnpm server:build

# 运行 client（通过 stdio 自动启动 MCP server）
pnpm client
```
