import type { Usage, TurnChunk, ToolCall } from "@halo-sdk/core";
import type { ModelAdapter, ModelCapabilities, PricingInfo, ChatParams, ModelCallOptions } from "@halo-sdk/core";

export class DeepSeekAdapter implements ModelAdapter {
  readonly modelId: string;
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = {
    toolUse: true,
    streaming: true,
  };

  /** DeepSeek pricing (USD per 1K tokens). */
  readonly pricing: PricingInfo = {
    inputPricePer1k: 0.00027,
    cachedInputPricePer1k: 0.00007,
  };

  private _apiKey: string;
  private _baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this._apiKey = opts.apiKey;
    this.modelId = opts.model ?? "deepseek-v4-flash";
    this._baseUrl = (opts.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, "");
  }

  async chat(
    params: ChatParams,
  ): Promise<{
    content: string;
    toolCalls: ToolCall[];
    usage: Usage;
  }> {
    const { prefix, history, tools, responseFormat, options } = params;
    const messages = [...prefix, ...history];
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream: false,
    };
    if (tools?.length) body.tools = tools;
    if (responseFormat) body.response_format = responseFormat;
    if (options) this._applyOptions(body, options);

    const resp = await fetch(`${this._baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok) {
      throw new Error(`DeepSeek ${resp.status}: ${await resp.text()}`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await resp.json();
    const choice = data.choices?.[0]?.message;
    const usageRaw = data.usage;

    const content: string = choice?.content ?? "";
    const toolCalls: ToolCall[] = choice?.tool_calls ?? [];

    const promptTokens: number = usageRaw?.prompt_tokens ?? 0;
    const completionTokens: number = usageRaw?.completion_tokens ?? 0;
    const cacheHit: number = usageRaw?.prompt_cache_hit_tokens ?? 0;
    const cacheMiss: number =
      usageRaw?.prompt_cache_miss_tokens ?? Math.max(0, promptTokens - cacheHit);

    const usage: Usage = {
      promptTokens,
      completionTokens,
      caching: {
        hitTokens: cacheHit,
        missTokens: cacheMiss,
        hitRate: cacheHit + cacheMiss > 0 ? cacheHit / (cacheHit + cacheMiss) : 0,
      },
    };

    return { content, toolCalls, usage };
  }

  async *stream(
    params: ChatParams,
  ): AsyncGenerator<TurnChunk> {
    const { prefix, history, tools, responseFormat, options } = params;
    const messages = [...prefix, ...history];
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (tools?.length) body.tools = tools;
    if (responseFormat) body.response_format = responseFormat;
    if (options) this._applyOptions(body, options);

    const resp = await fetch(`${this._baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this._apiKey}`,
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: JSON.stringify(body),
    });

    if (!resp.ok || !resp.body) {
      throw new Error(`DeepSeek ${resp.status}: ${await resp.text().catch(() => "")}`);
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    // Accumulate streaming tool-call deltas → emit tool-call-ready when complete.
    const tcBuilder = new Map<
      number,
      { name: string; arguments: string; id: string }
    >();

    const flushToolCalls = async function* () {
      for (const [index, tc] of tcBuilder) {
        if (tc.name) {
          yield {
            type: "tool-call-ready" as const,
            index,
            call: {
              id: tc.id || `call_${index}`,
              type: "function" as const,
              function: { name: tc.name, arguments: tc.arguments },
            },
          };
        }
      }
      tcBuilder.clear();
    };

    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const data = trimmed.slice(6);
          if (data === "[DONE]") {
            yield* flushToolCalls();
            yield {
              type: "done",
              usage: { promptTokens: 0, completionTokens: 0 },
            };
            return;
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const json: any = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield {
                type: "text-delta",
                delta: String(delta.content),
              };
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const toolCalls: any[] | undefined = delta?.tool_calls;
            if (toolCalls) {
              for (let i = 0; i < toolCalls.length; i++) {
                const tc = toolCalls[i]!;
                const idx = typeof tc.index === "number" ? tc.index : i;
                const existing = tcBuilder.get(idx) ?? {
                  name: "",
                  arguments: "",
                  id: tc.id ?? `call_${idx}`,
                };
                if (tc.function?.name) existing.name = String(tc.function.name);
                if (tc.function?.arguments) {
                  existing.arguments += String(tc.function.arguments);
                }
                if (tc.id) existing.id = tc.id;
                tcBuilder.set(idx, existing);

                yield {
                  type: "tool-call-delta",
                  index: idx,
                  name: tc.function
                    ? String(tc.function.name ?? "")
                    : undefined,
                  argumentsDelta: tc.function
                    ? String(tc.function.arguments ?? "")
                    : undefined,
                };
              }
            }
            const usageRaw = json.usage;
            if (usageRaw) {
              const promptTokens = usageRaw.prompt_tokens ?? 0;
              const completionTokens = usageRaw.completion_tokens ?? 0;
              const cacheHit = usageRaw.prompt_cache_hit_tokens ?? 0;
              const cacheMiss =
                usageRaw.prompt_cache_miss_tokens ??
                Math.max(0, promptTokens - cacheHit);

              // Emit tool-call-ready for all accumulated tool calls
              // before the final done chunk.
              yield* flushToolCalls();

              yield {
                type: "done",
                usage: {
                  promptTokens,
                  completionTokens,
                  caching: {
                    hitTokens: cacheHit,
                    missTokens: cacheMiss,
                    hitRate:
                      cacheHit + cacheMiss > 0
                        ? cacheHit / (cacheHit + cacheMiss)
                        : 0,
                  },
                },
              };
            }
          } catch {
            /* skip malformed SSE frame */
          }
        }
      }

      // Stream ended without an explicit usage chunk.
      yield* flushToolCalls();
    } finally {
      reader.releaseLock();
    }
  }

  private _applyOptions(body: Record<string, unknown>, options: ModelCallOptions): void {
    if (options.temperature !== undefined) body.temperature = options.temperature;
    if (options.topP !== undefined) body.top_p = options.topP;
    if (options.topK !== undefined) body.top_k = options.topK;
    if (options.maxTokens !== undefined) body.max_tokens = options.maxTokens;
    if (options.seed !== undefined) body.seed = options.seed;
    if (options.stop !== undefined) body.stop = options.stop;
  }
}
