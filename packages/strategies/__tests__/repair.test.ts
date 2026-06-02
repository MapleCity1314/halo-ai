import { describe, it, expect } from "vitest";
import { BasicRepair } from "../src/basic-repair.js";
import type { ToolCall } from "@halo-ai/core";

describe("BasicRepair", () => {
  it("passes through valid JSON", () => {
    const repair = new BasicRepair();
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: '{"key":"value"}' },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(0);
    expect(result.toolCalls).toEqual(calls);
  });

  it("fixes truncated JSON with missing closing brace", () => {
    const repair = new BasicRepair();
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: '{"key":"value"' },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(1);
    // Should have added closing brace
    const fixed = result.toolCalls[0]!.function.arguments;
    expect(() => JSON.parse(fixed)).not.toThrow();
    expect(JSON.parse(fixed)).toEqual({ key: "value" });
  });

  it("fixes truncated JSON with missing closing bracket", () => {
    const repair = new BasicRepair();
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: '["a","b"' },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(1);
    const fixed = result.toolCalls[0]!.function.arguments;
    expect(() => JSON.parse(fixed)).not.toThrow();
    expect(JSON.parse(fixed)).toEqual(["a", "b"]);
  });

  it("fixes truncated JSON with unterminated string", () => {
    const repair = new BasicRepair();
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: '{"key":"unterminated' },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(1);
    const fixed = result.toolCalls[0]!.function.arguments;
    expect(() => JSON.parse(fixed)).not.toThrow();
  });

  it("does not modify unfixable JSON", () => {
    const repair = new BasicRepair();
    const raw = "not json at all!!!";
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: raw },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(0);
    expect(result.toolCalls[0]!.function.arguments).toBe(raw);
  });

  it("handles empty arguments", () => {
    const repair = new BasicRepair();
    const calls: ToolCall[] = [
      {
        id: "call_1",
        type: "function",
        function: { name: "test", arguments: "" },
      },
    ];

    const result = repair.repair(calls, "");
    expect(result.fixed).toBe(0);
  });

  it("handles no tool calls", () => {
    const repair = new BasicRepair();
    const result = repair.repair([], "");
    expect(result.fixed).toBe(0);
    expect(result.toolCalls).toEqual([]);
  });
});
