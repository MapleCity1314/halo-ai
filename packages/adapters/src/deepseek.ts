import type { ChatMessage, ToolCall, ToolSpec, Usage, TurnChunk, ResponseFormat } from "@halo-sdk/core";
import type { ModelAdapter, ModelCapabilities, PricingInfo, ModelCallOptions } from "@halo-sdk/core";

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
    prefix: ChatMessage[],
    history: ChatMessage[],
    tools?: ToolSpec[],
    responseFormat?: ResponseFormat,
    options?: ModelCallOptions,
  ): Promise<{
    content: string;
    toolCalls: ToolCall[];
    usage: Usage;
  }> {
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
    prefix: ChatMessage[],
    history: ChatMessage[],
    tools?: ToolSpec[],
    responseFormat?: ResponseFormat,
    options?: ModelCallOptions,
  ): AsyncGenerator<TurnChunk> {
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
            yield { type: "done", usage: { promptTokens: 0, completionTokens: 0 } };
            return;
          }
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const json: any = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "text-delta", delta: String(delta.content) };
            }
            const toolCalls: any[] | undefined = delta?.tool_calls;
            if (toolCalls) {
              for (let i = 0; i < toolCalls.length; i++) {
                const tc = toolCalls[i]!;
                yield {
                  type: "tool-call-delta",
                  index: typeof tc.index === "number" ? tc.index : i,
                  name: tc.function ? String(tc.function.name ?? "") : undefined,
                  argumentsDelta: tc.function ? String(tc.function.arguments ?? "") : undefined,
                };
              }
            }
            const usageRaw = json.usage;
            if (usageRaw) {
              const promptTokens = usageRaw.prompt_tokens ?? 0;
              const completionTokens = usageRaw.completion_tokens ?? 0;
              const cacheHit = usageRaw.prompt_cache_hit_tokens ?? 0;
              const cacheMiss =
                usageRaw.prompt_cache_miss_tokens ?? Math.max(0, promptTokens - cacheHit);
              yield {
                type: "done",
                usage: {
                  promptTokens,
                  completionTokens,
                  caching: {
                    hitTokens: cacheHit,
                    missTokens: cacheMiss,
                    hitRate: cacheHit + cacheMiss > 0 ? cacheHit / (cacheHit + cacheMiss) : 0,
                  },
                },
              };
            }
          } catch {
            /* skip malformed SSE frame */
          }
        }
      }
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
