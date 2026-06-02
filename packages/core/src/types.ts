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

/** A tool definition registered with the session. */
export interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
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
