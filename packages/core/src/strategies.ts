import type { ChatMessage, ToolCall } from "./types.js";

// ── Context strategy ──

export interface ContextStrategy {
  /**
   * Prepare history for a context-limited send.
   *
   * `prefix` is READ-ONLY — strategies MUST NOT modify it.
   * Only `history` may be truncated / summarized.
   * This preserves the stable prefix for cache-hit guarantees.
   */
  prepare(
    prefix: ChatMessage[],
    history: ChatMessage[],
    ctxMax: number,
  ): {
    history: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  };
}

// ── Repair strategy ──

export interface RepairResult {
  toolCalls: ToolCall[];
  fixed: number;
  suppressed: number;
  notes: string[];
}

export interface RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult;
}
