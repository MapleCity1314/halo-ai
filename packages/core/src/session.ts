import type { ChatMessage, ToolCall, ToolDefinition, ToolSpec, Usage } from "./types.js";
import type { ContextStrategy, RepairStrategy } from "./strategies.js";
import type { ModelAdapter, ModelCallOptions } from "./model-adapter.js";

// ── Turn result ──

export interface TurnResult {
  content: string;
  toolCalls: ToolCall[];
  usage: Usage;
}

// ── Tool result ──

export interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}

// ── Streaming chunk ──

export type TurnChunk =
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-delta"; index: number; name?: string; argumentsDelta?: string }
  | { type: "tool-call-ready"; index: number; call: ToolCall }
  | { type: "done"; usage: Usage };

// ── Events ──

export type AgentEvent = "cache:miss" | "context:truncated" | "repair:applied";

// ── Cache diagnostics ──

export interface CacheMissReason {
  type: "cold-start" | "system-changed" | "tools-changed" | "fewshots-changed" | "unknown";
  detail: string;
  added?: string[];
  removed?: string[];
}

export interface PricingSnapshot {
  recordedAt: number;
  inputPricePer1k: number;
  cachedInputPricePer1k: number;
}

export interface SessionStats {
  turns: number;

  totalPromptTokens: number;
  totalCompletionTokens: number;

  caching?: {
    totalCacheHitTokens: number;
    totalCacheMissTokens: number;
    cacheHitRate: number;
    estimatedSavingsUsd: number | null;
  };

  pricingSnapshot: PricingSnapshot;

  recentDiagnostics: CacheMissReason[];
}

// ── Model configuration ──

export type { ModelCallOptions } from "./model-adapter.js";

/** Agent-level model defaults. Does NOT enter StablePrefix — safe to change without cache miss. */
export interface ModelConfig extends ModelCallOptions {}

// ── Session options ──

export interface HaloAgentOptions {
  adapter: ModelAdapter;

  /**
   * Prefix messages. All messages go into StablePrefix in order.
   * The first `role: "system"` message defines the system prompt;
   * remaining messages act as few-shot examples.
   *
   * Mutually exclusive with `system` / `fewShots`.
   */
  messages?: ChatMessage[];

  /** @deprecated Use `messages: [{ role: "system", content: "..." }]` instead. */
  system?: string;

  /**
   * Tools available to the model.
   *
   * Accepts either a flat array of `ToolSpec` objects (backward-compatible),
   * or a named record of `ToolDefinition` objects. When `ToolDefinition`
   * includes `execute`, the `run()` method calls it automatically —
   * no `onToolCall` callback needed.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools?: ToolSpec[] | Record<string, ToolDefinition<any>>;

  /** @deprecated Use `messages` with `role: "user"` / `role: "assistant"` entries instead. */
  fewShots?: ChatMessage[];

  /** Agent-level model defaults. Does not enter StablePrefix — safe to change without cache miss. */
  model?: ModelConfig;

  context?: ContextStrategy;
  repair?: RepairStrategy;

  on?: (event: AgentEvent, payload: unknown) => void;
}
