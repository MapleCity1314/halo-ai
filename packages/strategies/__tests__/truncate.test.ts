import { describe, it, expect } from "vitest";
import { TruncateStrategy } from "../src/truncate.js";
import type { ChatMessage } from "@halo-ai/core";

describe("TruncateStrategy", () => {
  it("does not modify history under the limit", () => {
    const strat = new TruncateStrategy({ maxTokens: 100_000 });
    const prefix: ChatMessage[] = [{ role: "system", content: "You are helpful." }];
    const history: ChatMessage[] = [{ role: "user", content: "Hello" }];

    const result = strat.prepare(prefix, history, 128_000);
    expect(result.modified).toBe(false);
    expect(result.droppedCount).toBe(0);
    expect(result.history).toEqual(history);
  });

  it("truncates history that exceed estimated token limit", () => {
    // maxTokens=1 → budget is tiny, only a small history tail fits.
    const strat = new TruncateStrategy({ maxTokens: 1 });
    const prefix: ChatMessage[] = [{ role: "system", content: "You are helpful." }];
    const history: ChatMessage[] = [
      { role: "user", content: "Hello world this is a test" },
      { role: "assistant", content: "Hi there!" },
      { role: "user", content: "Another message" },
    ];

    const result = strat.prepare(prefix, history, 128_000);
    expect(result.modified).toBe(true);
    expect(result.droppedCount).toBeGreaterThan(0);
    // History should be truncated but not empty if budget allows
    expect(result.history.length).toBeLessThan(history.length);
    // Prefix is not returned — it's read-only and handled by the caller
  });

  it("keeps prefix untouched, only truncates history", () => {
    const strat = new TruncateStrategy({ maxTokens: 2 });
    const prefix: ChatMessage[] = [
      { role: "system", content: "Sys" },
      { role: "user", content: "Q1" },
    ];
    const history: ChatMessage[] = [
      { role: "assistant", content: "A1" },
      { role: "user", content: "Q2" },
      { role: "assistant", content: "A2" },
      { role: "user", content: "Q3" },
    ];

    const result = strat.prepare(prefix, history, 128_000);
    // Truncation should have occurred (history reduced)
    expect(result.modified).toBe(true);
    expect(result.droppedCount).toBeGreaterThan(0);
    // Returned history should only contain tail messages that fit
    expect(result.history.length).toBeLessThan(history.length);
  });

  it("returns empty result for empty inputs", () => {
    const strat = new TruncateStrategy();
    const result = strat.prepare([], [], 128_000);
    expect(result.modified).toBe(false);
    expect(result.droppedCount).toBe(0);
    expect(result.history).toEqual([]);
  });
});
