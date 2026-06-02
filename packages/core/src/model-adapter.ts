import type { ChatMessage, ToolCall, ToolSpec, Usage } from "./types.js";
import type { TurnChunk } from "./session.js";

export interface ModelCapabilities {
  prefixCaching: boolean;
  toolUse: boolean;
  streaming: boolean;
  cacheTokenFields?: {
    hitField: string;
    missField: string;
  };
}

export interface ModelAdapter {
  chat(
    messages: ChatMessage[],
    tools?: ToolSpec[],
  ): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }>;

  stream(messages: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk>;

  readonly modelId: string;
  readonly contextWindow: number;
  readonly capabilities: ModelCapabilities;
}
