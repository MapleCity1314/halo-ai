import { describe, it, expect } from "vitest";
import { toDataStream, createHaloStream } from "../src/stream.js";
import type { TurnChunk, Usage } from "@halo-ai/core";

async function collectResponse(resp: Response): Promise<string> {
  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();
  let result = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    result += decoder.decode(value, { stream: true });
  }
  return result;
}

async function* makeSource(chunks: TurnChunk[]): AsyncGenerator<TurnChunk> {
  for (const c of chunks) yield c;
}

describe("toDataStream", () => {
  it("emits text-delta as 0: lines", async () => {
    const resp = toDataStream(makeSource([{ type: "text-delta", delta: "Hello" }]));
    const text = await collectResponse(resp);
    expect(text).toContain("0:");
    expect(text).toContain("Hello");
  });

  it("emits tool-call-delta as 9: lines", async () => {
    const resp = toDataStream(
      makeSource([
        {
          type: "tool-call-delta",
          index: 0,
          name: "search",
          argumentsDelta: '{"q":"',
        },
      ]),
    );
    const text = await collectResponse(resp);
    expect(text).toContain("9:");
    expect(text).toContain("search");
  });

  it("emits tool-call-ready as 9: lines", async () => {
    const resp = toDataStream(
      makeSource([
        {
          type: "tool-call-ready",
          index: 0,
          call: {
            id: "call_1",
            type: "function",
            function: { name: "search", arguments: '{"q":"test"}' },
          },
        },
      ]),
    );
    const text = await collectResponse(resp);
    expect(text).toContain("9:");
    expect(text).toContain("call_1");
  });

  it("emits done with usage as d: line", async () => {
    const usage: Usage = {
      promptTokens: 100,
      completionTokens: 50,
    };
    const resp = toDataStream(makeSource([{ type: "done", usage }]));
    const text = await collectResponse(resp);
    expect(text).toContain("d:");
    expect(text).toContain("100");
  });

  it("sets correct SSE headers", () => {
    const resp = toDataStream(makeSource([]));
    expect(resp.headers.get("Content-Type")).toBe("text/event-stream");
    expect(resp.headers.get("Cache-Control")).toBe("no-cache");
    expect(resp.headers.get("Connection")).toBe("keep-alive");
  });

  it("combines multiple chunks in order", async () => {
    const resp = toDataStream(
      makeSource([
        { type: "text-delta", delta: "Hello " },
        { type: "text-delta", delta: "World" },
        { type: "done", usage: { promptTokens: 1, completionTokens: 2 } },
      ]),
    );
    const text = await collectResponse(resp);
    const lines = text.split("\n").filter(Boolean);
    expect(lines[0]).toContain("0:");
    expect(lines[1]).toContain("0:");
    expect(lines[2]).toContain("d:");
  });
});

describe("createHaloStream", () => {
  it("writes text chunks", async () => {
    const stream = createHaloStream(async (ctrl) => {
      ctrl.writeText("Hello");
      ctrl.writeText(" World");
      ctrl.close();
    });

    const reader = stream.getReader();
    const decoder = new TextDecoder();
    const chunks: string[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      chunks.push(decoder.decode(value));
    }
    expect(chunks.join("")).toBe("Hello World");
  });

  it("supports close", async () => {
    const stream = createHaloStream(async (ctrl) => {
      ctrl.writeText("data");
      ctrl.close({ promptTokens: 10, completionTokens: 5 });
    });

    const reader = stream.getReader();
    const parts: string[] = [];
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      parts.push(new TextDecoder().decode(value));
    }
    expect(parts).toContain("data");
  });
});
