import type { ChatMessage, ToolCall, ToolSpec, Usage, ResponseFormat } from "./types.js";
import type { TurnChunk } from "./session.js";

export interface ModelCapabilities {
  toolUse: boolean;
  streaming: boolean;
}

/** Pricing information for cost-tracking. Exposed by adapters that support caching. */
export interface PricingInfo {
  inputPricePer1k: number;
  cachedInputPricePer1k: number;
}

/** Per-request model parameters. Overrides agent-level defaults. */
export interface ModelCallOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxTokens?: number;
  seed?: number;
  stop?: string[];
}

export { type ResponseFormat } from "./types.js";

export interface ModelAdapter {
  /**
   * Send a chat request with separated stable prefix and dynamic history.
   *
   * The separation lets adapters apply provider-specific caching strategies:
   * - DeepSeek / OpenAI-compatible: concat `[...prefix, ...history]` (prefix caching)
   * - Anthropic: mark prefix messages with `cache_control` breakpoints
   * - Gemini: use prefix to create/manage a `CachedContent` resource
   */
  chat(
    prefix: ChatMessage[],
    history: ChatMessage[],
    tools?: ToolSpec[],
    responseFormat?: ResponseFormat,
    options?: ModelCallOptions,
  ): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }>;

  /** Stream variant with the same prefix/history separation. */
  stream(
    prefix: ChatMessage[],
    history: ChatMessage[],
    tools?: ToolSpec[],
    responseFormat?: ResponseFormat,
    options?: ModelCallOptions,
  ): AsyncGenerator<TurnChunk>;

  readonly modelId: string;
  readonly contextWindow: number;
  readonly capabilities: ModelCapabilities;

  /**
   * Pricing data for cache-savings estimation.
   * Omit if the provider doesn't support caching — savings will be `null`.
   */
  readonly pricing?: PricingInfo;

  /**
   * Optional: provider-specific cache keep-alive.
   * The session falls back to a periodic ping (sending prefix + "ping" message)
   * when this is not implemented.
   */
  keepAlive?(prefix: ChatMessage[]): { stop: () => void };
}
