import type { ToolDefinition } from "@halo-sdk/core";

// ── Transport ──

export interface StdioTransportConfig {
  type: "stdio";
  command: string;
  args?: string[];
  env?: Record<string, string>;
  cwd?: string;
}

export interface SSETransportConfig {
  type: "sse";
  url: string;
  headers?: Record<string, string>;
}

export type TransportConfig = StdioTransportConfig | SSETransportConfig;

// ── Resource ──

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface PaginatedRequestParams {
  cursor?: string;
}

export interface ListResourcesResult {
  resources: MCPResource[];
  nextCursor?: string;
}

export interface ReadResourceResult {
  contents: { uri: string; mimeType?: string; text?: string; blob?: string }[];
}

// ── Prompt ──

export interface MCPPrompt {
  name: string;
  description?: string;
  arguments?: { name: string; description?: string; required?: boolean }[];
}

export interface ListPromptsResult {
  prompts: MCPPrompt[];
  nextCursor?: string;
}

export interface GetPromptResult {
  messages: { role: "user" | "assistant"; content: string }[];
}

// ── Server connection ──

export interface MCPServerConnection {
  /** Discover tools and convert to Halo ToolDefinition. */
  tools(): Promise<Record<string, ToolDefinition>>;

  /** List available resources (optional slot). */
  listResources(params?: PaginatedRequestParams): Promise<ListResourcesResult>;

  /** Read a resource by URI (optional slot). */
  readResource(uri: string): Promise<ReadResourceResult>;

  /** List available prompts (optional slot). */
  listPrompts(params?: PaginatedRequestParams): Promise<ListPromptsResult>;

  /** Get a prompt by name (optional slot). */
  getPrompt(name: string, args?: Record<string, unknown>): Promise<GetPromptResult>;

  /** Server metadata from the initialize handshake. */
  serverInfo: { name: string; version: string };

  /** Optional instructions from the server. */
  instructions?: string;

  /** Close the connection and clean up resources. */
  close(): Promise<void>;
}
