import type {
  ChatMessage,
  ToolCall,
  ToolSpec,
  Usage,
  TurnChunk,
  ModelAdapter,
  ModelCapabilities,
} from "../src/index.js";
/**
 * Mock adapter that returns pre-programmed responses.
 * Call `mockChat()` / `mockStream()` before each test to set expected results.
 */
export class MockAdapter implements ModelAdapter {
  readonly modelId = "mock-model";
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = {
    prefixCaching: true,
    toolUse: true,
    streaming: true,
  };

  chatFn:
    | ((
        messages: ChatMessage[],
        tools?: ToolSpec[],
      ) => Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }>)
    | null = null;
  streamFn: ((messages: ChatMessage[], tools?: ToolSpec[]) => AsyncGenerator<TurnChunk>) | null =
    null;

  async chat(
    messages: ChatMessage[],
    tools?: ToolSpec[],
  ): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }> {
    if (!this.chatFn) throw new Error("MockAdapter.chat not configured");
    return this.chatFn(messages, tools);
  }

  async *stream(messages: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk> {
    if (!this.streamFn) throw new Error("MockAdapter.stream not configured");
    yield* this.streamFn(messages, tools);
  }
}

/** Default usage object for tests. */
export const defaultUsage: Usage = {
  promptTokens: 100,
  completionTokens: 50,
  caching: {
    hitTokens: 80,
    missTokens: 20,
    hitRate: 0.8,
  },
};

/** Usage object for a cache miss scenario (no cached tokens). */
export const cacheMissUsage: Usage = {
  promptTokens: 100,
  completionTokens: 50,
  caching: {
    hitTokens: 0,
    missTokens: 100,
    hitRate: 0,
  },
};

/** A sample tool call for testing. */
export const sampleToolCall: ToolCall = {
  id: "call_1",
  type: "function",
  function: {
    name: "get_weather",
    arguments: '{"city":"Paris"}',
  },
};

/** A sample tool spec for testing. */
export const sampleToolSpec: ToolSpec = {
  type: "function",
  function: {
    name: "get_weather",
    description: "Get the weather for a city",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string" },
      },
      required: ["city"],
    },
  },
};
