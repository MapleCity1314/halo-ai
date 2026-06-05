import type { ChatMessage, ContextStrategy } from "@halo-sdk/core";

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

    // Prefer keeping non-discardable messages. Discardable messages
    // (e.g. loadSkill results) are the first to go when truncating.
    const budgetLimit = budgetChars * 0.9;

    // Pass 1: keep non-discardable, newest first.
    const kept: ChatMessage[] = [];
    let keptTokens = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]!;
      if (msg.discardable) continue;
      const size = msg.content.length;
      if (keptTokens + size > budgetLimit) break;
      keptTokens += size;
      kept.unshift(msg);
    }

    // Pass 2: backfill discardable messages if budget remains.
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i]!;
      if (!msg.discardable) continue;
      const size = msg.content.length;
      if (keptTokens + size > budgetLimit) break;
      keptTokens += size;
      // Insert in chronological order.
      const insertIdx = kept.findIndex(
        (m, idx) =>
          idx === kept.length - 1 ||
          history.indexOf(m) > history.indexOf(msg),
      );
      kept.splice(insertIdx === -1 ? kept.length : insertIdx, 0, msg);
    }

    const droppedCount = history.length - kept.length;

    return {
      history: kept,
      modified: droppedCount > 0,
      droppedCount,
    };
  }
}
