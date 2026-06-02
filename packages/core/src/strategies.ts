import type { ChatMessage, ToolCall } from "./types.js";

// ── Context strategy ──

export interface ContextStrategy {
  prepare(
    messages: ChatMessage[],
    ctxMax: number,
  ): {
    messages: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  };
}

// ── Repair strategy ──

export interface RepairResult {
  toolCalls: ToolCall[];
  fixed: number;
  scavenged: number;
  suppressed: number;
  notes: string[];
}

export interface RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult;
}

// ── Confirmation strategy ──

export interface ConfirmationStrategy {
  approve(name: string, args: Record<string, unknown>): Promise<boolean>;
}
