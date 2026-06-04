/** Message roles in the OpenAI-compatible chat protocol. */
export type Role = "system" | "user" | "assistant" | "tool";

/** A single message in the chat protocol. */
export interface ChatMessage {
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

/** A tool call requested by the model. */
export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}

/** A tool definition in OpenAI function-calling format. */
export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

/**
 * A tool definition with an optional built-in execute function.
 * Pass `Record<string, ToolDefinition>` to `halo.session({ tools: {...} })`
 * and `execute` will be called automatically — no `onToolCall` needed.
 */
export interface ToolDefinition<TArgs = Record<string, unknown>> {
  description: string;
  parameters: Record<string, unknown>;
  /** If provided, run() calls this automatically when the model requests this tool. */
  execute?: (args: TArgs) => string | Promise<string>;
}

/** Structured output format. OpenAI-compatible. */
export interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string;
    schema: Record<string, unknown>;
    strict?: boolean;
  };
}

/** Token usage for a single model call. */
export interface Usage {
  promptTokens: number;
  completionTokens: number;

  /** Only present when the adapter supports prefix caching. */
  caching?: {
    hitTokens: number;
    missTokens: number;
    hitRate: number;
  };
}
