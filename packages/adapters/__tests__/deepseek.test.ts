import { describe, it, expect, vi, beforeEach } from "vitest";
import { DeepSeekAdapter } from "../src/deepseek.js";

function mockFetch(status: number, data: unknown) {
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
    json: async () => data,
  });
}

function mockStreamFetch(chunks: string[]) {
  const encoder = new TextEncoder();
  let index = 0;

  const readable = new ReadableStream({
    pull(ctrl) {
      if (index < chunks.length) {
        ctrl.enqueue(encoder.encode(chunks[index]!));
        index++;
      } else {
        ctrl.close();
      }
    },
  });

  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    body: readable,
    text: async () => "stream",
  });
}

describe("DeepSeekAdapter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // --- constructor & defaults ---

  it("defaults to deepseek-v4-flash model and DeepSeek base URL", () => {
    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    expect(adapter.modelId).toBe("deepseek-v4-flash");
    expect(adapter.contextWindow).toBe(128_000);
    expect(adapter.capabilities).toEqual({ toolUse: true, streaming: true });
  });

  it("accepts custom model and baseUrl", () => {
    const adapter = new DeepSeekAdapter({
      apiKey: "sk-test",
      model: "deepseek-chat",
      baseUrl: "https://custom.api.com/v1/",
    });
    expect(adapter.modelId).toBe("deepseek-chat");
  });

  it("strips trailing slash from baseUrl", () => {
    const adapter = new DeepSeekAdapter({
      apiKey: "sk-test",
      baseUrl: "https://api.deepseek.com/",
    });
    // baseUrl is private; verify via chat() fetch call
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    vi.stubGlobal("fetch", fetchMock);

    adapter.chat({ prefix: [], history: [] });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.deepseek.com/chat/completions",
      expect.anything(),
    );
  });

  // --- pricing ---

  it("exposes DeepSeek pricing", () => {
    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    expect(adapter.pricing.inputPricePer1k).toBe(0.00027);
    expect(adapter.pricing.cachedInputPricePer1k).toBe(0.00007);
  });

  // --- chat() ---

  it("chat() returns content and usage from a successful response", async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: "Hello from DeepSeek!" } }],
      usage: { prompt_tokens: 100, completion_tokens: 50, prompt_cache_hit_tokens: 80 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const result = await adapter.chat({
      prefix: [{ role: "system", content: "Be helpful." }],
      history: [{ role: "user", content: "Hi" }],
    });

    expect(result.content).toBe("Hello from DeepSeek!");
    expect(result.toolCalls).toEqual([]);
    expect(result.usage.promptTokens).toBe(100);
    expect(result.usage.completionTokens).toBe(50);
    expect(result.usage.caching).toBeDefined();
    expect(result.usage.caching!.hitTokens).toBe(80);
    expect(result.usage.caching!.missTokens).toBe(20);
  });

  it("chat() handles empty content and missing usage gracefully", async () => {
    const fetchMock = mockFetch(200, { choices: [{}] });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const result = await adapter.chat({ prefix: [], history: [] });

    expect(result.content).toBe("");
    expect(result.toolCalls).toEqual([]);
    expect(result.usage.promptTokens).toBe(0);
    expect(result.usage.completionTokens).toBe(0);
  });

  it("chat() parses tool calls from response", async () => {
    const fetchMock = mockFetch(200, {
      choices: [
        {
          message: {
            content: "",
            tool_calls: [
              {
                id: "call_1",
                type: "function",
                function: { name: "get_weather", arguments: '{"city":"Beijing"}' },
              },
            ],
          },
        },
      ],
      usage: { prompt_tokens: 50, completion_tokens: 20 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const result = await adapter.chat({ prefix: [], history: [] });

    expect(result.toolCalls).toHaveLength(1);
    expect(result.toolCalls[0]!.id).toBe("call_1");
    expect(result.toolCalls[0]!.function.name).toBe("get_weather");
    expect(result.toolCalls[0]!.function.arguments).toBe('{"city":"Beijing"}');
    expect(result.content).toBe("");
  });

  it("chat() includes tools in request body when provided", async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const tools = [
      {
        type: "function" as const,
        function: { name: "search", description: "search the web", parameters: [] },
      },
    ];
    await adapter.chat({ prefix: [], history: [], tools });

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.tools).toEqual(tools);
  });

  it("chat() throws on non-ok response", async () => {
    const fetchMock = mockFetch(500, { error: "Internal Server Error" });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    await expect(adapter.chat({ prefix: [], history: [] })).rejects.toThrow("DeepSeek 500:");
  });

  it("chat() sends messages from prefix + history concatenated", async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const prefix = [{ role: "system" as const, content: "You are helpful." }];
    const history = [{ role: "user" as const, content: "Hello" }];
    await adapter.chat({ prefix, history });

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.messages).toHaveLength(2);
    expect(body.messages[0]).toEqual(prefix[0]);
    expect(body.messages[1]).toEqual(history[0]);
  });

  it("chat() caches hit rate is 0 when no tokens", async () => {
    const fetchMock = mockFetch(200, {
      choices: [{ message: { content: "ok" } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const result = await adapter.chat({ prefix: [], history: [] });
    expect(result.usage.caching!.hitRate).toBe(0);
  });

  // --- stream() ---

  it("stream() yields text-delta chunks", async () => {
    const fetchMock = mockStreamFetch([
      'data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const chunks: unknown[] = [];
    for await (const chunk of adapter.stream({ prefix: [], history: [] })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(3);
    expect(chunks[0]).toEqual({ type: "text-delta", delta: "Hello" });
    expect(chunks[1]).toEqual({ type: "text-delta", delta: " world" });
    expect(chunks[2]).toEqual({ type: "done", usage: { promptTokens: 0, completionTokens: 0 } });
  });

  it("stream() yields tool-call-delta and tool-call-ready chunks", async () => {
    const fetchMock = mockStreamFetch([
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"name":"get_weather","arguments":"{\\"ci"}}]}}]}\n\n',
      'data: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"ty\\":\\"Beijing\\"}"}}]}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const chunks: unknown[] = [];
    for await (const chunk of adapter.stream({ prefix: [], history: [] })) {
      chunks.push(chunk);
    }

    // 2 tool-call-delta + 1 tool-call-ready (assembled) + 1 done = 4
    expect(chunks).toHaveLength(4);
    expect(chunks[0]).toMatchObject({ type: "tool-call-delta", index: 0, name: "get_weather" });
    expect(chunks[1]).toMatchObject({ type: "tool-call-delta", index: 0 });

    const ready = chunks[2] as {
      type: string;
      call: { function: { name: string; arguments: string } };
    };
    expect(ready.type).toBe("tool-call-ready");
    expect(ready.call.function.name).toBe("get_weather");
    expect(ready.call.function.arguments).toBe('{"city":"Beijing"}');

    const done = chunks[3] as { type: string };
    expect(done.type).toBe("done");
  });

  it("stream() yields usage in done chunk when present", async () => {
    const fetchMock = mockStreamFetch([
      'data: {"choices":[{"delta":{"content":"ok"}}],"usage":{"prompt_tokens":100,"completion_tokens":50,"prompt_cache_hit_tokens":80,"prompt_cache_miss_tokens":20}}\n\n',
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const chunks: unknown[] = [];
    for await (const chunk of adapter.stream({ prefix: [], history: [] })) {
      chunks.push(chunk);
    }

    const done = chunks.find((c) => (c as { type: string }).type === "done");
    expect(done).toBeDefined();
    expect((done as { usage: { promptTokens: number } }).usage.promptTokens).toBe(100);
    expect((done as { usage: { caching: { hitTokens: number } } }).usage.caching!.hitTokens).toBe(
      80,
    );
  });

  it("stream() throws on non-ok response", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      body: null,
      text: async () => "Unauthorized",
    });
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const it = adapter.stream({ prefix: [], history: [] });
    await expect(it.next()).rejects.toThrow("DeepSeek 401:");
  });

  it("stream() includes tools in request body when provided", async () => {
    const fetchMock = mockStreamFetch(["data: [DONE]\n\n"]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const tools = [
      {
        type: "function" as const,
        function: { name: "search", description: "search the web", parameters: [] },
      },
    ];
    const it = adapter.stream({ prefix: [], history: [], tools });
    // consume the generator
    for await (const _ of it) {
      /* drain */
    }

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.tools).toEqual(tools);
  });

  it("stream() sends stream:true and stream_options", async () => {
    const fetchMock = mockStreamFetch(["data: [DONE]\n\n"]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    for await (const _ of adapter.stream({ prefix: [], history: [] })) {
      /* drain */
    }

    const body = JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);
    expect(body.stream).toBe(true);
    expect(body.stream_options).toEqual({ include_usage: true });
  });

  it("stream() handles empty SSE frames and skips non-data lines", async () => {
    const fetchMock = mockStreamFetch([
      "\n",
      ":heartbeat\n\n",
      'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
      "data: [DONE]\n\n",
    ]);
    vi.stubGlobal("fetch", fetchMock);

    const adapter = new DeepSeekAdapter({ apiKey: "sk-test" });
    const chunks: unknown[] = [];
    for await (const chunk of adapter.stream({ prefix: [], history: [] })) {
      chunks.push(chunk);
    }

    expect(chunks).toHaveLength(2);
    expect(chunks[0]).toEqual({ type: "text-delta", delta: "ok" });
  });
});
