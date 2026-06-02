import type { ChatMessage, ContextStrategy } from "@halo-ai/core";

export class TruncateStrategy implements ContextStrategy {
  private _maxTokens: number;

  constructor(opts?: { maxTokens?: number }) {
    // Default: 80% of a 128K context window.
    this._maxTokens = opts?.maxTokens ?? 102_400;
  }

  prepare(
    prefix: ChatMessage[],
    history: ChatMessage[],
    _ctxMax: number,
  ): {
    history: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  } {
    // Prefix is read-only — only history may be truncated.
    const histEstimate = history.reduce((sum, m) => sum + m.content.length, 0);
    const prefixEstimate = prefix.reduce((sum, m) => sum + m.content.length, 0);
    const budgetChars = (this._maxTokens - prefixEstimate / 4) * 4;

    if (histEstimate <= budgetChars * 0.9) {
      return { history, modified: false, droppedCount: 0 };
    }

    // Keep the most recent messages that fit the remaining budget.
    let tailTokens = 0;
    const tail: ChatMessage[] = [];
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]!;
      const size = msg.content.length;
      if (tailTokens + size > budgetChars * 0.9) break;
      tailTokens += size;
      tail.unshift(msg);
    }

    const droppedCount = history.length - tail.length;

    return {
      history: tail,
      modified: droppedCount > 0,
      droppedCount,
    };
  }
}
