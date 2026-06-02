import type { ChatMessage, ToolCall, ToolSpec, Usage } from "./types.js";
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
  ): Promise<{ content: string; toolCalls: ToolCall[]; usage: Usage }>;

  /** Stream variant with the same prefix/history separation. */
  stream(
    prefix: ChatMessage[],
    history: ChatMessage[],
    tools?: ToolSpec[],
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
