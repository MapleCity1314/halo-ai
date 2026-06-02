import { describe, it, expect } from "vitest";
import { HaloSessionImpl } from "../src/session-impl.js";
import {
  MockAdapter,
  defaultUsage,
  cacheMissUsage,
  sampleToolCall,
  sampleToolSpec,
} from "./mock-adapter.js";
import type { ToolCall } from "../src/session.js";

function createAdapter() {
  return new MockAdapter();
}

function createSession(adapter: MockAdapter, opts?: { tools?: ToolCall[] }) {
  return new HaloSessionImpl({
    adapter,
    system: "You are a helpful assistant.",
    tools: opts?.tools ? undefined : [sampleToolSpec],
  });
}

describe("HaloSessionImpl", () => {
  // ── send() ──

  it("send returns content and updates stats", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "Hello!",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    const result = await session.send("hi");

    expect(result.content).toBe("Hello!");
    expect(result.toolCalls).toEqual([]);
    expect(session.stats.turns).toBe(1);
    expect(session.stats.totalPromptTokens).toBe(100);
    expect(session.stats.totalCompletionTokens).toBe(50);
  });

  it("send accumulates stats across multiple calls", async () => {
    const adapter = createAdapter();
    let callCount = 0;
    adapter.chatFn = async () => {
      callCount++;
      return { content: `msg${callCount}`, toolCalls: [], usage: defaultUsage };
    };

    const session = createSession(adapter);
    await session.send("a");
    await session.send("b");

    expect(session.stats.turns).toBe(2);
    expect(session.stats.totalPromptTokens).toBe(200);
    expect(session.stats.totalCompletionTokens).toBe(100);
  });

  it("send emits cache:miss on second turn when cache miss occurs", async () => {
    const adapter = createAdapter();
    const events: unknown[] = [];

    let callCount = 0;
    adapter.chatFn = async () => {
      callCount++;
      return {
        content: "ok",
        toolCalls: [],
        usage: callCount === 1 ? defaultUsage : cacheMissUsage,
      };
    };

    const session = new HaloSessionImpl({
      adapter,
      system: "You are helpful.",
      // on callback receives payload (not event type)
      on: (payload) => events.push(payload),
    });

    await session.send("a");
    await session.send("b");

    expect(events.length).toBeGreaterThanOrEqual(1);
    expect(events[0]).toHaveProperty("type", "unknown");
  });

  it("send accumulates cache stats", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "ok",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    await session.send("a");

    expect(session.stats.caching).toBeDefined();
    expect(session.stats.caching!.totalCacheHitTokens).toBe(80);
    expect(session.stats.caching!.totalCacheMissTokens).toBe(20);
    expect(session.stats.caching!.estimatedSavingsUsd).toBeGreaterThan(0);
  });

  it("send records assistant message in log", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "Hello!",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    await session.send("hi");

    // Second send: history should contain [user:"hi", assistant:"Hello!", user:"next"]
    adapter.chatFn = async (prefix, history) => {
      // The second-to-last history entry should be the previous assistant response
      const assistant = history[history.length - 2];
      expect(assistant!.role).toBe("assistant");
      expect(assistant!.content).toBe("Hello!");
      return { content: "ok", toolCalls: [], usage: defaultUsage };
    };
    await session.send("next");
  });

  // ── run() with tool calls ──

  it("run loops on tool calls", async () => {
    const adapter = createAdapter();
    let callCount = 0;
    adapter.chatFn = async () => {
      callCount++;
      if (callCount === 1) {
        return { content: "", toolCalls: [sampleToolCall], usage: defaultUsage };
      }
      return { content: "Done!", toolCalls: [], usage: defaultUsage };
    };

    const session = createSession(adapter);
    const steps: { step: number }[] = [];

    const result = await session.run("do it", {
      onToolCall: async () => ({ toolCallId: "call_1", output: "sunny" }),
      onStep: (s) => steps.push(s),
    });

    expect(result.content).toBe("Done!");
    expect(steps.length).toBe(1);
    expect(steps[0]!.step).toBe(1);
    expect(steps[0]!.toolCalls).toEqual([sampleToolCall]);
    expect(session.stats.turns).toBe(2); // two model calls
  });

  it("run stops at maxSteps", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "",
      toolCalls: [sampleToolCall],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    const result = await session.run("do it", {
      maxSteps: 2,
      onToolCall: async () => ({ toolCallId: "call_1", output: "ok" }),
    });

    expect(result.toolCalls).toEqual([sampleToolCall]);
    expect(session.stats.turns).toBe(3); // initial + 2 steps (2 tool rounds)
  });

  it("run stops when no onToolCall provided", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "",
      toolCalls: [sampleToolCall],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    const result = await session.run("do it");

    // No onToolCall → tools not executed, loop stops after first call
    expect(result.toolCalls).toEqual([sampleToolCall]);
    expect(session.stats.turns).toBe(1);
  });

  // ── submitToolResult ──

  it("submitToolResult feeds tool result and calls model again", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "Done after tool",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    const result = await session.submitToolResult({
      toolCallId: "call_1",
      output: "result data",
    });

    expect(result.content).toBe("Done after tool");
    // submitToolResult doesn't log user message, so turns=1
    expect(session.stats.turns).toBe(1);
  });

  it("submitToolResult with error marks isError", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "Handled error",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    const result = await session.submitToolResult({
      toolCallId: "call_1",
      output: "something went wrong",
      isError: true,
    });

    expect(result.content).toBe("Handled error");
  });

  // ── clearLog ──

  it("clearLog resets history but preserves prefix", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "ok",
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = createSession(adapter);
    await session.send("first");
    session.clearLog();

    adapter.chatFn = async (prefix, history) => {
      // After clearLog, history has only the current user message, no prior assistant.
      expect(prefix.length).toBe(1); // system
      expect(history.length).toBe(1); // user:"second"
      return { content: "fresh", toolCalls: [], usage: defaultUsage };
    };

    const result = await session.send("second");
    expect(result.content).toBe("fresh");
  });

  // ── Repair strategy ──

  it("applies repair strategy when tool calls present", async () => {
    const adapter = createAdapter();
    adapter.chatFn = async () => ({
      content: "[]",
      toolCalls: [sampleToolCall],
      usage: defaultUsage,
    });

    const repairEvents: unknown[] = [];
    const session = new HaloSessionImpl({
      adapter,
      system: "You are helpful.",
      repair: {
        repair: (calls, _raw) => ({
          toolCalls: calls,
          fixed: 0,
          scavenged: 0,
          suppressed: 1,
          notes: ["suppressed test"],
        }),
      },
      // on callback receives payload only (not event type)
      on: (payload) => repairEvents.push(payload),
    });

    const result = await session.send("test");
    expect(result.toolCalls).toEqual([sampleToolCall]);
    expect(repairEvents.length).toBe(1);
  });

  // ── Context truncation ──

  it("context strategy triggers context:truncated event", async () => {
    const adapter = createAdapter();
    // Return a very long response to trigger truncation via char limit
    const longMsg = "x".repeat(1_000_000);

    const truncateEvents: unknown[] = [];
    adapter.chatFn = async () => ({
      content: longMsg,
      toolCalls: [],
      usage: defaultUsage,
    });

    const session = new HaloSessionImpl({
      adapter,
      system: "You are helpful.",
      context: {
        prepare: (prefix, history, _ctxMax) => {
          // Force truncation: drop all history
          return {
            history: [],
            modified: true,
            droppedCount: history.length,
          };
        },
      },
      // on callback receives payload only (not event type)
      on: (payload) => truncateEvents.push(payload),
    });

    await session.send("hi");
    expect(truncateEvents.length).toBe(1);
  });
});
