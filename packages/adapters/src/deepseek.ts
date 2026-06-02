import type { ChatMessage, ToolCall, ToolSpec, Usage, TurnChunk } from "@halo-ai/core";
import type { ModelAdapter, ModelCapabilities } from "@halo-ai/core";

export class DeepSeekAdapter implements ModelAdapter {
  readonly modelId: string;
  readonly contextWindow = 128_000;
  readonly capabilities: ModelCapabilities = {
    prefixCaching: true,
    toolUse: true,
    streaming: true,
  };

  private _apiKey: string;
  private _baseUrl: string;

  constructor(opts: { apiKey: string; model?: string; baseUrl?: string }) {
    this._apiKey = opts.apiKey;
    this.modelId = opts.model ?? "deepseek-v4-flash";
    this._baseUrl = (opts.baseUrl ?? "https://api.deepseek.com").replace(/\/+$/, "");
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolSpec[],
  ): Promise<{
    content: string;
    toolCalls: ToolCall[];
    usage: Usage;
  }> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream: false,
    };
    if (tools?.length) body.tools = tools;

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

    const data = (await resp.json()) as Record<string, unknown>;
    const choice = (data.choices as Array<Record<string, unknown>>)?.[0]?.message as
      | Record<string, unknown>
      | undefined;
    const usageRaw = data.usage as Record<string, number> | undefined;

    const content = (choice?.content as string) ?? "";
    const toolCalls = (choice?.tool_calls as ToolCall[]) ?? [];

    const promptTokens = usageRaw?.prompt_tokens ?? 0;
    const completionTokens = usageRaw?.completion_tokens ?? 0;
    const cacheHit = (usageRaw?.prompt_cache_hit_tokens as number) ?? 0;
    const cacheMiss =
      (usageRaw?.prompt_cache_miss_tokens as number) ?? Math.max(0, promptTokens - cacheHit);

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

  async *stream(messages: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk> {
    const body: Record<string, unknown> = {
      model: this.modelId,
      messages,
      stream: true,
      stream_options: { include_usage: true },
    };
    if (tools?.length) body.tools = tools;

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
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta;
            if (delta?.content) {
              yield { type: "text-delta", delta: delta.content as string };
            }
            if (delta?.tool_calls) {
              for (
                let i = 0;
                i < (delta.tool_calls as Array<Record<string, unknown>>).length;
                i++
              ) {
                const tc = (delta.tool_calls as Array<Record<string, unknown>>)[i]!;
                yield {
                  type: "tool-call-delta",
                  index: (tc.index as number) ?? i,
                  name: tc.function ? (tc.function as Record<string, string>).name : undefined,
                  argumentsDelta: tc.function
                    ? (tc.function as Record<string, string>).arguments
                    : undefined,
                };
              }
            }
            const usageRaw = json.usage as Record<string, number> | undefined;
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
}
