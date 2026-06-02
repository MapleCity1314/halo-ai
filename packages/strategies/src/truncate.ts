import type { ChatMessage, ContextStrategy } from "@halo-ai/core";

export class TruncateStrategy implements ContextStrategy {
  private _maxTokens: number;

  constructor(opts?: { maxTokens?: number }) {
    // Default: 80% of DeepSeek's 128K context window
    this._maxTokens = opts?.maxTokens ?? 102_400;
  }

  prepare(
    messages: ChatMessage[],
    _ctxMax: number,
  ): {
    messages: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  } {
    // Simple char-count heuristic (rough proxy for tokens).
    const estimate = messages.reduce((sum, m) => sum + m.content.length, 0);

    if (estimate <= this._maxTokens * 4) {
      return { messages, modified: false, droppedCount: 0 };
    }

    // Keep the prefix (first 2 messages: system + optional few-shot)
    // plus the most recent messages that fit the budget.
    const prefixCount = 2;
    const prefix = messages.slice(0, prefixCount);

    let tailTokens = 0;
    const tail: ChatMessage[] = [];
    for (let i = messages.length - 1; i >= prefixCount; i--) {
      const msg = messages[i]!;
      const size = msg.content.length;
      if (tailTokens + size > this._maxTokens * 4 * 0.9) break;
      tailTokens += size;
      tail.unshift(msg);
    }

    const result = [...prefix, ...tail];
    const droppedCount = messages.length - result.length;

    return {
      messages: result,
      modified: droppedCount > 0,
      droppedCount,
    };
  }
}
