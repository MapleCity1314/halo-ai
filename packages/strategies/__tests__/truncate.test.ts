import { describe, it, expect } from "vitest";
import { TruncateStrategy } from "../src/truncate.js";
import type { ChatMessage } from "@halo-ai/core";

describe("TruncateStrategy", () => {
  it("does not modify messages under the limit", () => {
    const strat = new TruncateStrategy({ maxTokens: 100_000 });
    const msgs: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello" },
    ];

    const result = strat.prepare(msgs, 128_000);
    expect(result.modified).toBe(false);
    expect(result.droppedCount).toBe(0);
    expect(result.messages).toEqual(msgs);
  });

  it("truncates messages that exceed estimated token limit", () => {
    // maxTokens=1 → any message is too large (1 token ≈ 4 chars)
    const strat = new TruncateStrategy({ maxTokens: 1 });
    const msgs: ChatMessage[] = [
      { role: "system", content: "You are helpful." },
      { role: "user", content: "Hello world this is a test" },
      { role: "assistant", content: "Hi there!" },
      { role: "user", content: "Another message" },
    ];

    const result = strat.prepare(msgs, 128_000);
    expect(result.modified).toBe(true);
    expect(result.droppedCount).toBeGreaterThan(0);
    // Prefix (first 2) should be preserved
    expect(result.messages.length).toBeGreaterThanOrEqual(2);
    expect(result.messages[0]!.role).toBe("system");
  });

  it("keeps prefix messages (system + optional few-shot)", () => {
    // Force truncation with small maxTokens. Use short messages so some
    // tail items fit within the budget.
    const strat = new TruncateStrategy({ maxTokens: 2 });
    const msgs: ChatMessage[] = [
      { role: "system", content: "Sys" },
      { role: "user", content: "Q1" },
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
      { role: "assistant", content: "A2" },
      { role: "user", content: "Q3" },
    ];

    const result = strat.prepare(msgs, 128_000);
    // prefix (first 2) are preserved
    expect(result.messages[0]!.role).toBe("system");
    expect(result.messages[1]!.role).toBe("user");
    // truncation should have occurred
    expect(result.modified).toBe(true);
    expect(result.droppedCount).toBeGreaterThan(0);
  });

  it("returns empty result for empty message list", () => {
    const strat = new TruncateStrategy();
    const result = strat.prepare([], 128_000);
    expect(result.modified).toBe(false);
    expect(result.droppedCount).toBe(0);
    expect(result.messages).toEqual([]);
  });
});
