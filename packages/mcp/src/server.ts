import type { ToolDefinition } from "@halo-sdk/core";
import type {
  MCPServerConnection,
  TransportConfig,
  ListResourcesResult,
  ReadResourceResult,
  ListPromptsResult,
  GetPromptResult,
  PaginatedRequestParams,
} from "./types.js";

// ── MCP SDK types (peer dependency) ──

interface MCPTool {
  name: string;
  description?: string;
  inputSchema: Record<string, unknown>;
}

interface MCPClient {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  connect(transport: any): Promise<void>;
  listTools(): Promise<{ tools: MCPTool[] }>;
  callTool(params: {
    name: string;
    arguments: Record<string, unknown>;
  }): Promise<{ content: { type: string; text?: string }[] }>;
  listResources(params?: {
    cursor?: string;
  }): Promise<{ resources: unknown[]; nextCursor?: string }>;
  readResource(params: {
    uri: string;
  }): Promise<{ contents: { uri: string; mimeType?: string; text?: string; blob?: string }[] }>;
  listPrompts(params?: { cursor?: string }): Promise<{ prompts: unknown[]; nextCursor?: string }>;
  getPrompt(params: {
    name: string;
    arguments?: Record<string, unknown>;
  }): Promise<{ messages: { role: string; content: unknown }[] }>;
  close(): Promise<void>;
}

// ── Public API ──

/**
 * Connect to an MCP server and return a connection object.
 *
 * The connection exposes `tools()` (the primary path),
 * plus optional `listResources` / `readResource` / `listPrompts` / `getPrompt` slots.
 *
 * @example
 * ```ts
 * const server = await createMCPServer({
 *   transport: { type: "stdio", command: "npx", args: ["-y", "mcp-server"] }
 * });
 * const tools = await server.tools();
 * const agent = halo.agent({ messages: [...], tools });
 * // ...
 * await server.close();
 * ```
 */
export async function createMCPServer(config: {
  transport: TransportConfig;
  clientName?: string;
  version?: string;
}): Promise<MCPServerConnection> {
  const clientName = config.clientName ?? "halo-sdk-mcp";
  const version = config.version ?? "1.0.0";

  // Dynamically import MCP SDK (peer dep).
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Client: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let transportImpl: any;

  try {
    const sdk = await import("@modelcontextprotocol/sdk/client");
    Client = sdk.Client;
  } catch {
    throw new Error(
      "Failed to import @modelcontextprotocol/sdk. Make sure it is installed as a peer dependency.",
    );
  }

  const client: MCPClient = new Client({ name: clientName, version }, { capabilities: {} });

  // Create transport.
  if (config.transport.type === "stdio") {
    try {
      const stdioMod = await import("@modelcontextprotocol/sdk/client/stdio");
      const StdioTransport = stdioMod.StdioClientTransport;
      transportImpl = new StdioTransport({
        command: config.transport.command,
        args: config.transport.args,
        env: config.transport.env,
        cwd: config.transport.cwd,
      });
    } catch {
      throw new Error(
        "Failed to import StdioClientTransport. Ensure @modelcontextprotocol/sdk >= 1.0 is installed.",
      );
    }
  } else if (config.transport.type === "sse") {
    try {
      const sseMod = await import("@modelcontextprotocol/sdk/client/sse");
      const SSETransport = sseMod.SSEClientTransport;
      transportImpl = new SSETransport(new URL(config.transport.url), {
        requestInit: config.transport.headers ? { headers: config.transport.headers } : undefined,
      });
    } catch {
      throw new Error(
        "Failed to import SSEClientTransport. Ensure @modelcontextprotocol/sdk >= 1.0 is installed.",
      );
    }
  } else {
    throw new Error(`Unsupported transport type: ${(config.transport as TransportConfig).type}`);
  }

  await client.connect(transportImpl);

  // Capture server metadata from initialize.
  const serverInfo = { name: "mcp-server", version: "0.0.0" };
  const instructions: string | undefined = undefined;

  const connection: MCPServerConnection = {
    serverInfo,
    instructions,

    async tools(): Promise<Record<string, ToolDefinition>> {
      const { tools: mcpTools } = await client.listTools();
      const result: Record<string, ToolDefinition> = {};

      for (const t of mcpTools) {
        result[t.name] = {
          description: t.description ?? `MCP tool: ${t.name}`,
          parameters: t.inputSchema,
          execute: async (args: Record<string, unknown>) => {
            const callResult = await client.callTool({
              name: t.name,
              arguments: args,
            });
            // Extract text from content array.
            const textParts = callResult.content
              .filter((c) => c.type === "text" && typeof c.text === "string")
              .map((c) => c.text!)
              .join("\n");
            return textParts || JSON.stringify(callResult.content);
          },
        };
      }

      return result;
    },

    async listResources(params?: PaginatedRequestParams): Promise<ListResourcesResult> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await client.listResources(params as any);
      return raw as unknown as ListResourcesResult;
    },

    async readResource(uri: string): Promise<ReadResourceResult> {
      const raw = await client.readResource({ uri });
      return raw as ReadResourceResult;
    },

    async listPrompts(params?: PaginatedRequestParams): Promise<ListPromptsResult> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const raw = await client.listPrompts(params as any);
      return raw as unknown as ListPromptsResult;
    },

    async getPrompt(name: string, args?: Record<string, unknown>): Promise<GetPromptResult> {
      const raw = await client.getPrompt({ name, arguments: args });
      return {
        messages: raw.messages.map((m: { role: string; content: unknown }) => ({
          role: m.role as "user" | "assistant",
          content:
            typeof (m.content as { text?: string })?.text === "string"
              ? (m.content as { text: string }).text
              : typeof m.content === "string"
                ? m.content
                : JSON.stringify(m.content),
        })),
      };
    },

    close: async () => {
      await client.close();
    },
  };

  return connection;
}
