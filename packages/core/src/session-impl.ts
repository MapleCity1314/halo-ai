import { StablePrefix } from "./prefix.js";
import { MessageLog } from "./log.js";
import type { ChatMessage, ToolCall, ToolSpec } from "./types.js";
import type {
  TurnResult,
  TurnChunk,
  ToolResult,
  SessionEvent,
  SessionStats,
  HaloSessionOptions,
} from "./session.js";
import type { ModelAdapter } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy, ConfirmationStrategy } from "./strategies.js";

/** Internal implementation. Exported for testing only. */
export class HaloSessionImpl {
  private _adapter: ModelAdapter;
  private _prefix: StablePrefix;
  private _log: MessageLog;
  private _context: ContextStrategy | undefined;
  private _repair: RepairStrategy | undefined;
  private _confirmation: ConfirmationStrategy | undefined;
  private _listeners: Map<SessionEvent, Set<(payload: unknown) => void>>;
  private _stats: SessionStats;
  private _keepAliveTimer: ReturnType<typeof setInterval> | null = null;

  constructor(opts: HaloSessionOptions) {
    this._adapter = opts.adapter;
    this._prefix = new StablePrefix({
      system: opts.system,
      tools: opts.tools ?? [],
      fewShots: opts.fewShots,
    });
    this._log = new MessageLog();
    this._context = opts.context;
    this._repair = opts.repair;
    this._confirmation = opts.confirmation;
    this._listeners = new Map();

    // Register external listener if provided.
    if (opts.on) {
      for (const ev of ["cache:miss", "context:truncated", "repair:applied"] as SessionEvent[]) {
        this._listeners.set(ev, new Set());
        this._listeners.get(ev)!.add(opts.on as (p: unknown) => void);
      }
    }

    this._stats = {
      turns: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      pricingSnapshot: {
        recordedAt: Date.now(),
        inputPricePer1k: DEEPSEEK_INPUT_PRICE,
        cachedInputPricePer1k: DEEPSEEK_CACHED_INPUT_PRICE,
      },
      recentDiagnostics: [],
    };

    if (this._adapter.capabilities.prefixCaching) {
      this._stats.caching = {
        totalCacheHitTokens: 0,
        totalCacheMissTokens: 0,
        cacheHitRate: 0,
        estimatedSavingsUsd: null,
      };
    }
  }

  // ── Core ──

  get stats(): Readonly<SessionStats> {
    return this._stats;
  }

  async run(
    input: string,
    opts?: {
      maxSteps?: number;
      onToolCall?: (call: ToolCall) => Promise<ToolResult>;
      onStep?: (s: { step: number; content: string; toolCalls: ToolCall[] }) => void;
    },
  ): Promise<TurnResult> {
    const maxSteps = opts?.maxSteps ?? 10;
    const onToolCall = opts?.onToolCall;
    const onStep = opts?.onStep;

    let step = 0;
    let result = await this.send(input);

    while (result.toolCalls.length > 0 && step < maxSteps) {
      step++;
      if (!onToolCall) break;

      for (const call of result.toolCalls) {
        const r = await onToolCall(call);
        this._log.append({
          role: "tool",
          tool_call_id: call.id,
          content: r.isError ? `ERROR: ${r.output}` : r.output,
        });
      }

      onStep?.({ step, content: result.content, toolCalls: result.toolCalls });
      result = await this._callModel();
    }

    return result;
  }

  async send(input: string): Promise<TurnResult> {
    this._log.append({ role: "user", content: input });
    return this._callModel();
  }

  async *stream(input: string): AsyncGenerator<TurnChunk> {
    this._log.append({ role: "user", content: input });
    const messages = this._buildMessages();
    yield* this._adapter.stream(messages, this._prefix.tools());
  }

  async submitToolResult(result: ToolResult): Promise<TurnResult> {
    this._log.append({
      role: "tool",
      tool_call_id: result.toolCallId,
      content: result.isError ? `ERROR: ${result.output}` : result.output,
    });
    return this._callModel();
  }

  // ── Prefix ──

  addTool(spec: ToolSpec): void {
    this._prefix.addTool(spec);
  }
  removeTool(name: string): void {
    this._prefix.removeTool(name);
  }
  addFewShot(msg: ChatMessage): void {
    this._prefix.addFewShot(msg);
  }
  removeFewShot(index: number): boolean {
    return this._prefix.removeFewShot(index);
  }

  // ── Keep-alive ──

  keepAlive(intervalMs?: number): { stop: () => void } {
    const ms = intervalMs ?? 120_000;
    if (this._keepAliveTimer) clearInterval(this._keepAliveTimer);
    this._keepAliveTimer = setInterval(() => {
      this._adapter
        .chat([...this._prefix.toMessages(), { role: "user", content: "ping" }], undefined)
        .catch(() => {
          /* keep-alive failure is silent */
        });
    }, ms);
    return { stop: () => this._stopKeepAlive() };
  }

  // ── Lifecycle ──

  clearLog(): void {
    this._log = new MessageLog();
  }

  setSystem(system: string): void {
    this._prefix = new StablePrefix({
      system,
      tools: this._prefix.tools(),
    });
  }

  // ── Private ──

  private _buildMessages(): ChatMessage[] {
    const messages = [...this._prefix.toMessages(), ...this._log.toFullHistory()];

    if (this._context) {
      const ctxMax = this._adapter.contextWindow;
      const prepared = this._context.prepare(messages, ctxMax);
      if (prepared.modified) {
        this._emit("context:truncated", {
          droppedCount: prepared.droppedCount,
          summary: prepared.summary,
        });
      }
      return prepared.messages;
    }

    return messages;
  }

  private async _callModel(): Promise<TurnResult> {
    const messages = this._buildMessages();
    const tools = this._prefix.tools();

    const { content, toolCalls, usage } = await this._adapter.chat(
      messages,
      tools.length > 0 ? tools : undefined,
    );

    // Apply repair.
    let repairedCalls = toolCalls;
    if (this._repair && toolCalls.length > 0) {
      const rr = this._repair.repair(toolCalls, content);
      repairedCalls = rr.toolCalls;
      if (rr.fixed > 0 || rr.suppressed > 0) {
        this._emit("repair:applied", {
          fixed: rr.fixed,
          suppressed: rr.suppressed,
          notes: rr.notes,
        });
      }
    }

    // Append assistant message.
    const assistantMsg: ChatMessage = { role: "assistant", content };
    if (repairedCalls.length > 0) assistantMsg.tool_calls = repairedCalls;
    this._log.append(assistantMsg);

    // Update stats.
    this._stats.turns++;
    this._stats.totalPromptTokens += usage.promptTokens;
    this._stats.totalCompletionTokens += usage.completionTokens;

    if (this._stats.caching && usage.caching) {
      this._stats.caching.totalCacheHitTokens += usage.caching.hitTokens;
      this._stats.caching.totalCacheMissTokens += usage.caching.missTokens;
      const total =
        this._stats.caching.totalCacheHitTokens + this._stats.caching.totalCacheMissTokens;
      this._stats.caching.cacheHitRate =
        total > 0 ? this._stats.caching.totalCacheHitTokens / total : 0;
      this._stats.caching.estimatedSavingsUsd = this._computeSavings(
        this._stats.caching.totalCacheHitTokens,
      );

      if (usage.caching.missTokens > 0 && this._stats.turns > 1) {
        this._emit("cache:miss", {
          type: "unknown" as const,
          detail: `missTokens: ${usage.caching.missTokens}`,
        });
      }
    }

    return { content, toolCalls: repairedCalls, usage };
  }

  private _emit(event: SessionEvent, payload: unknown): void {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(payload);
      } catch {
        /* silent */
      }
    }
  }

  private _stopKeepAlive(): void {
    if (this._keepAliveTimer) {
      clearInterval(this._keepAliveTimer);
      this._keepAliveTimer = null;
    }
  }

  private _computeSavings(cacheHitTokens: number): number | null {
    if (!this._adapter.capabilities.prefixCaching) return null;
    return (cacheHitTokens / 1000) * (DEEPSEEK_INPUT_PRICE - DEEPSEEK_CACHED_INPUT_PRICE);
  }
}

// DeepSeek pricing (USD per 1K tokens).
const DEEPSEEK_INPUT_PRICE = 0.00027;
const DEEPSEEK_CACHED_INPUT_PRICE = 0.00007;
