import { StablePrefix } from "./prefix.js";
import { MessageLog } from "./log.js";
import { normalizeTools, definitionToSpec } from "./tool-utils.js";
import type { ChatMessage, ToolCall, ToolDefinition, ToolSpec } from "./types.js";
import type {
  TurnResult,
  TurnChunk,
  ToolResult,
  AgentEvent,
  SessionStats,
  HaloAgentOptions,
  ModelConfig,
} from "./session.js";
import type { ModelAdapter, ModelCallOptions } from "./model-adapter.js";
import type { ContextStrategy, RepairStrategy } from "./strategies.js";

/** Internal implementation. Exported for testing only. */
export class HaloAgentImpl {
  private _adapter: ModelAdapter;
  private _prefix: StablePrefix;
  private _log: MessageLog;
  private _context: ContextStrategy | undefined;
  private _repair: RepairStrategy | undefined;
  private _listeners: Map<AgentEvent, Set<(event: AgentEvent, payload: unknown) => void>>;
  private _stats: SessionStats;
  private _keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private _toolExecutors: Map<string, (args: Record<string, unknown>) => string | Promise<string>>;
  private _modelDefaults: ModelConfig;

  constructor(opts: HaloAgentOptions) {
    this._adapter = opts.adapter;
    this._modelDefaults = opts.model ?? {};

    // Normalize tools: accept both ToolSpec[] and Record<string, ToolDefinition>.
    const { toolSpecs, executors } = normalizeTools(opts.tools);
    this._toolExecutors = executors;

    // Resolve system + fewShots: prefer `messages`, fall back to legacy fields.
    let system: string;
    let fewShots: ChatMessage[] = [];

    if (opts.messages && opts.system !== undefined) {
      throw new Error(
        "Cannot specify both `messages` and `system`. Use `messages` with a `role: 'system'` entry, or use `system` alone.",
      );
    }

    if (opts.messages) {
      const systemMsg = opts.messages.find((m) => m.role === "system");
      system = systemMsg?.content ?? "";
      fewShots = opts.messages.filter((m) => m.role !== "system");
    } else {
      system = opts.system ?? "";
      fewShots = opts.fewShots ?? [];
    }

    this._prefix = new StablePrefix({
      system,
      tools: toolSpecs,
      fewShots,
    });
    this._log = new MessageLog();
    this._context = opts.context;
    this._repair = opts.repair;
    this._listeners = new Map();

    // Register external listener if provided.
    if (opts.on) {
      for (const ev of ["cache:miss", "context:truncated", "repair:applied"] as AgentEvent[]) {
        this._listeners.set(ev, new Set());
        this._listeners.get(ev)!.add(opts.on);
      }
    }

    this._stats = {
      turns: 0,
      totalPromptTokens: 0,
      totalCompletionTokens: 0,
      pricingSnapshot: {
        recordedAt: Date.now(),
        inputPricePer1k: this._adapter.pricing?.inputPricePer1k ?? 0,
        cachedInputPricePer1k: this._adapter.pricing?.cachedInputPricePer1k ?? 0,
      },
      recentDiagnostics: [],
    };

    if (this._adapter.pricing) {
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
    } & ModelCallOptions,
  ): Promise<TurnResult> {
    const { maxSteps, onToolCall, onStep, ...callOptions } = opts ?? {};

    let step = 0;
    let result = await this.send(input, callOptions);

    while (result.toolCalls.length > 0 && step < (maxSteps ?? 10)) {
      step++;

      for (const call of result.toolCalls) {
        const executor = this._toolExecutors.get(call.function.name);
        if (executor) {
          // Auto-execute when tool definition includes execute().
          let parsed: Record<string, unknown>;
          try {
            parsed = JSON.parse(call.function.arguments);
          } catch {
            parsed = {};
          }
          const output = await executor(parsed);
          this._log.append({
            role: "tool",
            tool_call_id: call.id,
            content: output,
          });
        } else if (onToolCall) {
          const r = await onToolCall(call);
          this._log.append({
            role: "tool",
            tool_call_id: call.id,
            content: r.isError ? `ERROR: ${r.output}` : r.output,
          });
        } else {
          // No executor and no onToolCall — stop loop, return current result.
          return result;
        }
      }

      onStep?.({ step, content: result.content, toolCalls: result.toolCalls });
      result = await this._callModel(callOptions);
    }

    return result;
  }

  async send(input: string, options?: ModelCallOptions): Promise<TurnResult> {
    this._log.append({ role: "user", content: input });
    return this._callModel(options);
  }

  async *stream(input: string, options?: ModelCallOptions): AsyncGenerator<TurnChunk> {
    this._log.append({ role: "user", content: input });
    const prefix = this._prefix.toMessages();
    const history = this._log.toFullHistory();
    const merged: ModelCallOptions = { ...this._modelDefaults, ...options };
    yield* this._adapter.stream(prefix, history, this._prefix.tools(), undefined, merged);
  }

  async submitToolResult(result: ToolResult, options?: ModelCallOptions): Promise<TurnResult> {
    this._log.append({
      role: "tool",
      tool_call_id: result.toolCallId,
      content: result.isError ? `ERROR: ${result.output}` : result.output,
    });
    return this._callModel(options);
  }

  /**
   * Stream-compatible entry for AI SDK (useChat) integration.
   *
   * Accepts UIMessages from `useChat()`, converts them to ChatMessages,
   * hydrates prior history, then streams the last user message.
   *
   * When tools with `execute` are present, uses `run()` for auto-execution.
   * Otherwise uses `stream()` for plain text streaming.
   *
   * Cache-first: only `_log` is modified via hydrate(), `_prefix` is untouched.
   */
  async *sdkStream(
    messages: { role: string; content: string }[],
  ): AsyncGenerator<TurnChunk> {
    // Convert UIMessages → ChatMessages (system role is already in prefix).
    const chatMessages: ChatMessage[] = messages
      .filter((m) => m.role !== "system")
      .map((m) => ({
        role: m.role as ChatMessage["role"],
        content: m.content,
      }));

    if (chatMessages.length === 0) {
      yield { type: "text-delta", delta: "" };
      yield { type: "done", usage: { promptTokens: 0, completionTokens: 0 } };
      return;
    }

    // Last message is the current user input; everything before it is history.
    const lastMsg = chatMessages.pop()!;
    if (chatMessages.length > 0) {
      this.hydrate(chatMessages);
    }

    // If the agent has tools with auto-execute, use run() for full tool loop.
    if (this._toolExecutors.size > 0) {
      const result = await this.run(lastMsg.content);
      yield { type: "text-delta", delta: result.content };
      yield { type: "done", usage: result.usage };
      return;
    }

    // Plain text: stream normally.
    yield* this.stream(lastMsg.content);
  }

  // ── Prefix ──

  addTool(spec: ToolSpec): void;
  addTool(name: string, def: ToolDefinition): void;
  addTool(specOrName: ToolSpec | string, def?: ToolDefinition): void {
    if (typeof specOrName === "string") {
      // addTool(name, def)
      const name = specOrName;
      const d = def!;
      const spec = definitionToSpec(name, d);
      this._prefix.addTool(spec);
      if (d.execute) {
        this._toolExecutors.set(name, d.execute);
      }
    } else {
      // addTool(spec)
      this._prefix.addTool(specOrName);
    }
  }
  removeTool(name: string): void {
    this._prefix.removeTool(name);
    this._toolExecutors.delete(name);
  }
  addFewShot(msg: ChatMessage): void {
    this._prefix.addFewShot(msg);
  }
  removeFewShot(index: number): boolean {
    return this._prefix.removeFewShot(index);
  }

  // ── Keep-alive ──

  keepAlive(intervalMs?: number): { stop: () => void } {
    // Delegate to adapter if it provides a custom keep-alive (e.g. Gemini).
    if (this._adapter.keepAlive) {
      return this._adapter.keepAlive(this._prefix.toMessages());
    }

    // Default: periodic ping to maintain server-side KV cache.
    const ms = intervalMs ?? 120_000;
    if (this._keepAliveTimer) clearInterval(this._keepAliveTimer);
    this._keepAliveTimer = setInterval(() => {
      this._adapter
        .chat(
          this._prefix.toMessages(),
          [{ role: "user", content: "ping" }],
          undefined,
          undefined,
          undefined,
        )
        .catch(() => {
          /* keep-alive failure is silent */
        });
    }, ms);
    return { stop: () => this._stopKeepAlive() };
  }

  // ── Hydrate ──

  /** Restore conversation state from external history. */
  hydrate(messages: ChatMessage[]): void {
    this._log.hydrate(messages);
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

  /** Resolve history, applying ContextStrategy (prefix is read-only). */
  private _resolveHistory(): ChatMessage[] {
    const prefix = this._prefix.toMessages();
    let history = this._log.toFullHistory();

    if (this._context) {
      const ctxMax = this._adapter.contextWindow;
      const prepared = this._context.prepare(prefix, history, ctxMax);
      if (prepared.modified) {
        this._emit("context:truncated", {
          droppedCount: prepared.droppedCount,
          summary: prepared.summary,
        });
      }
      return prepared.history;
    }

    return history;
  }

  private async _callModel(options?: ModelCallOptions): Promise<TurnResult> {
    const prefix = this._prefix.toMessages();
    const history = this._resolveHistory();
    const tools = this._prefix.tools();

    const merged: ModelCallOptions = { ...this._modelDefaults, ...options };

    const { content, toolCalls, usage } = await this._adapter.chat(
      prefix,
      history,
      tools.length > 0 ? tools : undefined,
      undefined, // responseFormat
      merged,
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

  private _emit(event: AgentEvent, payload: unknown): void {
    const handlers = this._listeners.get(event);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(event, payload);
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
    if (!this._adapter.pricing) return null;
    return (
      (cacheHitTokens / 1000) *
      (this._adapter.pricing.inputPricePer1k - this._adapter.pricing.cachedInputPricePer1k)
    );
  }
}


