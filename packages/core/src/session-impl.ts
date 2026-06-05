import { StablePrefix } from "./prefix.js";
import { MessageLog } from "./log.js";
import { normalizeTools, definitionToSpec } from "./tool-utils.js";
import type { ChatMessage, ToolCall, ToolDefinition, ToolSpec, Usage } from "./types.js";
import type {
  TurnResult,
  TurnChunk,
  ToolResult,
  AgentEvent,
  SessionStats,
  HaloAgentOptions,
  ModelConfig,
  StreamTextOptions,
  StreamTextResult,
  SkillMetadata,
  GenerateObjectOptions,
  GenerateObjectResult,
} from "./session.js";
import type { ModelAdapter, ModelCallOptions } from "./model-adapter.js";
import type { ResponseFormat } from "./types.js";
import type { Sandbox, ToolContext } from "./sandbox.js";
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
  private _sandbox: Sandbox | undefined;

  constructor(opts: HaloAgentOptions) {
    this._adapter = opts.adapter;
    this._modelDefaults = opts.model ?? {};
    this._sandbox = opts.sandbox;

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

    // Inject skills metadata into system prompt (progressive disclosure).
    const skills = opts.skills;
    if (skills && skills.length > 0) {
      system = system
        ? `${system}\n\n## Available Skills\n${skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}`
        : `## Available Skills\n${skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}`;
    }

    this._prefix = new StablePrefix({
      system,
      tools: toolSpecs,
      fewShots,
    });

    // Auto-register `loadSkill` tool if skills are present.
    if (skills && skills.length > 0) {
      const reservedName = "loadSkill";
      if (this._toolExecutors.has(reservedName)) {
        throw new Error(
          `Reserved tool name "${reservedName}" conflicts with agent skills. Remove "${reservedName}" from your tools or pass an empty skills array.`,
        );
      }

      const loadSkillSpec: ToolSpec = {
        type: "function",
        function: {
          name: reservedName,
          description:
            "Load a skill to get specialized instructions for a specific task.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "The skill name to load (case-insensitive).",
              },
            },
            required: ["name"],
          },
        },
      };

      this._prefix.addTool(loadSkillSpec);

      // The execute function reads SKILL.md at runtime.
      this._toolExecutors.set(reservedName, async (args: Record<string, unknown>) => {
        const skillName = String(args.name ?? "").toLowerCase();
        const skill = skills.find(
          (s) => s.name.toLowerCase() === skillName,
        );
        if (!skill) {
          const available = skills.map((s) => s.name).join(", ");
          return `Skill "${skillName}" not found. Available: ${available}`;
        }
        try {
          // @nodeOnly — uses Node.js fs
          const { readFile } = await import("node:fs/promises");
          const content = await readFile(`${skill.path}/SKILL.md`, "utf-8");
          return stripFrontmatter(content);
        } catch (err) {
          return `Failed to load skill "${skillName}": ${String(err)}`;
        }
      });
    }
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

  async generateText(
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
          const output = await this._executeTool(call, executor);
          this._log.append({
            role: "tool",
            tool_call_id: call.id,
            content: output,
            discardable: call.function.name === "loadSkill",
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
    yield* this._adapter.stream({ prefix, history, tools: this._prefix.tools(), options: merged });
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
      const result = await this.generateText(lastMsg.content);
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
        .chat({
          prefix: this._prefix.toMessages(),
          history: [{ role: "user", content: "ping" }],
        })
        .catch(() => {
          /* keep-alive failure is silent */
        });
    }, ms);
    return { stop: () => this._stopKeepAlive() };
  }

  // ── StreamText ──

  /**
   * Streaming entry with full tool-call loop.
   * Accepts both a plain string and a ChatMessage[] (for AI SDK useChat integration).
   */
  streamText(
    input: string | ChatMessage[],
    opts?: StreamTextOptions,
  ): StreamTextResult {
    return new StreamTextResultImpl(this._streamWithToolLoop(input, opts));
  }

  private async *_streamWithToolLoop(
    input: string | ChatMessage[],
    opts?: StreamTextOptions,
  ): AsyncGenerator<TurnChunk> {
    const {
      maxSteps,
      onToolCall,
      onChunk,
      onStepFinish,
      onFinish,
      onError,
      ...callOptions
    } = opts ?? {};

    // Normalize input.
    if (typeof input === "string") {
      this._log.append({ role: "user", content: input });
    } else {
      const chatMessages: ChatMessage[] = input
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as ChatMessage["role"], content: m.content }));

      if (chatMessages.length === 0) {
        yield { type: "text-delta", delta: "" };
        yield { type: "done", usage: { promptTokens: 0, completionTokens: 0 } };
        return;
      }

      const lastMsg = chatMessages.pop()!;
      if (chatMessages.length > 0) this.hydrate(chatMessages);
      this._log.append(lastMsg);
    }

    const merged: ModelCallOptions = { ...this._modelDefaults, ...callOptions };
    const limit = maxSteps ?? 10;

    let stepCount = 0;
    const totalUsage: Usage = { promptTokens: 0, completionTokens: 0 };
    const allToolCalls: ToolCall[] = [];
    let fullText = "";

    try {
      let hasToolCalls = true;

      while (hasToolCalls && stepCount <= limit) {
        hasToolCalls = false;
        let stepText = "";
        const stepToolCalls: ToolCall[] = [];
        let stepUsage: Usage | null = null;

        const prefix = this._prefix.toMessages();
        const history = this._resolveHistory();
        const tools = this._prefix.tools();

        for await (const chunk of this._adapter.stream({
          prefix,
          history,
          tools: tools.length > 0 ? tools : undefined,
          options: merged,
        })) {
          if (chunk.type === "text-delta") {
            stepText += chunk.delta;
            fullText += chunk.delta;
          } else if (chunk.type === "tool-call-ready") {
            stepToolCalls.push(chunk.call);
            allToolCalls.push(chunk.call);
            hasToolCalls = true;
          } else if (chunk.type === "done") {
            stepUsage = chunk.usage;
          }

          onChunk?.({ chunk });
          yield chunk;
        }

        // Fallback: if adapter didn't send "done", estimate usage.
        const usage = stepUsage ?? { promptTokens: 0, completionTokens: 0 };
        totalUsage.promptTokens += usage.promptTokens;
        totalUsage.completionTokens += usage.completionTokens;

        if (hasToolCalls && stepCount < limit) {
          stepCount++;

          // Append assistant message BEFORE tool results (correct protocol order).
          const assistantMsg: ChatMessage = { role: "assistant", content: stepText };
          if (stepToolCalls.length > 0) assistantMsg.tool_calls = stepToolCalls;
          this._log.append(assistantMsg);

          for (const call of stepToolCalls) {
            const executor = this._toolExecutors.get(call.function.name);
            if (executor) {
              const output = await this._executeTool(call, executor);
              this._log.append({
                role: "tool",
                tool_call_id: call.id,
                content: output,
                discardable: call.function.name === "loadSkill",
              });
            } else if (onToolCall) {
              const r = await onToolCall(call);
              this._log.append({
                role: "tool",
                tool_call_id: call.id,
                content: r.isError ? `ERROR: ${r.output}` : r.output,
              });
            } else {
              hasToolCalls = false;
            }
          }

          onStepFinish?.({ text: stepText, toolCalls: stepToolCalls, usage, step: stepCount });
        } else {
          // Final step (no more tool calls or limit reached).
          stepCount++;
          const assistantMsg: ChatMessage = { role: "assistant", content: stepText };
          if (stepToolCalls.length > 0) assistantMsg.tool_calls = stepToolCalls;
          this._log.append(assistantMsg);

          onStepFinish?.({ text: stepText, toolCalls: stepToolCalls, usage, step: stepCount });
        }
      }

      // Update session stats.
      this._stats.turns += stepCount;
      this._stats.totalPromptTokens += totalUsage.promptTokens;
      this._stats.totalCompletionTokens += totalUsage.completionTokens;

      onFinish?.({ text: fullText, usage: totalUsage, steps: stepCount, toolCalls: allToolCalls });
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
      throw error;
    }
  }

  // ── Object generation ──

  /**
   * Generate a structured object from a prompt.
   *
   * Schema (Zod or JSON Schema) is sent as `responseFormat` — does NOT
   * enter StablePrefix. Tools are suppressed for this call.
   */
  async generateObject<T = unknown>(
    input: string,
    opts: GenerateObjectOptions<unknown>,
  ): Promise<GenerateObjectResult<T>> {
    this._log.append({ role: "user", content: input });

    const prefix = this._prefix.toMessages();
    const history = this._resolveHistory();

    const { schema, ...callOptions } = opts;
    const responseFormat = await convertToResponseFormat(schema);
    const merged: ModelCallOptions = { ...this._modelDefaults, ...callOptions };

    const { content, usage } = await this._adapter.chat({
      prefix,
      history,
      responseFormat,
      options: merged,
    });

    // Parse JSON from content.
    let object: T;
    try {
      object = JSON.parse(content) as T;
    } catch {
      throw new Error(
        `Failed to parse generated object as JSON. Raw content: ${content.slice(0, 200)}`,
      );
    }

    // Append to message log.
    this._log.append({ role: "assistant", content });

    // Update stats.
    this._stats.turns++;
    this._stats.totalPromptTokens += usage.promptTokens;
    this._stats.totalCompletionTokens += usage.completionTokens;

    return { object, usage };
  }

  /**
   * Stream a progressively-built object from a prompt.
   *
   * Schema is sent as `responseFormat` — does NOT enter StablePrefix.
   * Tools are suppressed.
   */
  async *streamObject<T = unknown>(
    input: string,
    opts: GenerateObjectOptions<unknown>,
  ): AsyncGenerator<T> {
    this._log.append({ role: "user", content: input });

    const prefix = this._prefix.toMessages();
    const history = this._resolveHistory();

    const { schema, ...callOptions } = opts;
    const responseFormat = await convertToResponseFormat(schema);
    const merged: ModelCallOptions = { ...this._modelDefaults, ...callOptions };

    let fullContent = "";

    for await (const chunk of this._adapter.stream({
      prefix,
      history,
      responseFormat,
      options: merged,
    })) {
      if (chunk.type === "text-delta") {
        fullContent += chunk.delta;
        // Attempt progressive JSON parse.
        try {
          yield JSON.parse(fullContent) as T;
        } catch {
          // Partial JSON — skip yielding this iteration.
        }
      } else if (chunk.type === "done") {
        // Final parse.
        try {
          yield JSON.parse(fullContent) as T;
        } catch {
          throw new Error(
            `Failed to parse streamed object as JSON. Raw: ${fullContent.slice(0, 200)}`,
          );
        }

        // Append to log and update stats.
        this._log.append({ role: "assistant", content: fullContent });
        this._stats.turns++;
        this._stats.totalPromptTokens += chunk.usage.promptTokens;
        this._stats.totalCompletionTokens += chunk.usage.completionTokens;
      }
    }
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

  /**
   * Execute a tool call with automatic sandbox injection.
   * Detects execute.length: 2 params → passes ToolContext.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private async _executeTool(call: ToolCall, executor: (args: Record<string, unknown>, ctx?: ToolContext) => any): Promise<string> {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(call.function.arguments);
    } catch {
      parsed = {};
    }

    if (executor.length >= 2 && this._sandbox) {
      const ctx: ToolContext = { sandbox: this._sandbox };
      return String(await executor(parsed, ctx));
    }
    return String(await executor(parsed));
  }

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

    const { content, toolCalls, usage } = await this._adapter.chat({
      prefix,
      history,
      tools: tools.length > 0 ? tools : undefined,
      options: merged,
    });

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

// ── Helpers ──

/** Strip YAML frontmatter from SKILL.md content. */
function stripFrontmatter(content: string): string {
  const match = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/);
  return match ? content.slice(match[0].length).trim() : content.trim();
}

/**
 * Convert a Zod or JSON Schema to an OpenAI-compatible ResponseFormat.
 * Zod schemas are converted via dynamic import of `zod-to-json-schema`.
 * Plain JSON Schema objects pass through directly.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function convertToResponseFormat(schema: any): Promise<ResponseFormat> {
  // Detect Zod schema by checking for `_def` or `parse` properties.
  const isZod =
    typeof schema === "object" &&
    schema !== null &&
    ("_def" in schema || typeof schema.parse === "function");

  let jsonSchema: Record<string, unknown>;

  if (isZod) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod: any = await import("zod-to-json-schema");
      const zodToJsonSchema = mod.zodToJsonSchema ?? mod.default?.zodToJsonSchema ?? mod;
      jsonSchema = zodToJsonSchema(schema, {
        target: "openAi",
      }) as Record<string, unknown>;
    } catch {
      throw new Error(
        "zod-to-json-schema is required for Zod schema support. Install it as a peer dependency.",
      );
    }
  } else if (
    typeof schema === "object" &&
    schema !== null &&
    "type" in schema
  ) {
    // Plain JSON Schema — passthrough.
    jsonSchema = schema as Record<string, unknown>;
  } else {
    throw new Error(
      "schema must be a Zod schema or a plain JSON Schema object.",
    );
  }

  // Extract schema name from the JSON Schema (if present) or use "output".
  const name = (jsonSchema as { name?: string }).name ?? "output";
  const cleanSchema = { ...jsonSchema };
  delete (cleanSchema as { name?: string }).name;

  return {
    type: "json_schema",
    json_schema: {
      name,
      schema: cleanSchema,
      strict: true,
    },
  };
}

// ── StreamTextResult implementation ──

/**
 * Wraps an AsyncGenerator<TurnChunk> as a lazy, single-consumer
 * StreamTextResult. The generator is NOT consumed until the first
 * `.to*()` call or `.text`/`.usage` access drives the stream.
 *
 * Internally uses `ReadableStream.tee()` to split the stream into a
 * consumer branch (returned to the user) and an accumulator branch
 * (drained in the background to fulfill the text/usage promises).
 * Pick one consumption path — `toDataStream`, `toReadableStream`,
 * or `toAsyncIterable`. They share the same underlying source;
 * calling more than one will fail with a locked-stream error.
 */
class StreamTextResultImpl implements StreamTextResult {
  private _source: AsyncGenerator<TurnChunk>;
  private _started = false;
  private _text = "";
  private _usage: Usage = { promptTokens: 0, completionTokens: 0 };
  private _textResolve!: (value: string) => void;
  private _usageResolve!: (value: Usage) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _listeners = new Map<string, Set<(payload: any) => void>>();

  text: Promise<string>;
  usage: Promise<Usage>;

  constructor(source: AsyncGenerator<TurnChunk>) {
    this._source = source;
    this.text = new Promise((r) => (this._textResolve = r));
    this.usage = new Promise((r) => (this._usageResolve = r));
  }

  // ── Public ──

  toDataStream(opts?: { headers?: Record<string, string> }): Response {
    const [consumer, accumulator] = this._createStream().tee();
    this._drain(accumulator);

    const stream = this._encodeSSE(consumer);

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        ...opts?.headers,
      },
    });
  }

  toReadableStream(): ReadableStream<Uint8Array> {
    const [consumer, accumulator] = this._createStream().tee();
    this._drain(accumulator);
    return consumer;
  }

  async *toAsyncIterable(): AsyncIterable<TurnChunk> {
    const [consumer, accumulator] = this._createStream().tee();
    this._drain(accumulator);

    const reader = consumer.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            yield JSON.parse(trimmed) as any;
          } catch {
            /* skip malformed */
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  on(event: "text-delta", fn: (payload: TurnChunk & { type: "text-delta" }) => void): () => void;
  on(
    event: "tool-call-delta",
    fn: (payload: TurnChunk & { type: "tool-call-delta" }) => void,
  ): () => void;
  on(
    event: "tool-call-ready",
    fn: (payload: TurnChunk & { type: "tool-call-ready" }) => void,
  ): () => void;
  on(event: "done", fn: (payload: TurnChunk & { type: "done" }) => void): () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(event: string, fn: (payload: any) => void): () => void {
    let set = this._listeners.get(event);
    if (!set) {
      set = new Set();
      this._listeners.set(event, set);
    }
    set.add(fn);
    return () => set!.delete(fn);
  }

  // ── Private ──

  /**
   * Create the underlying ReadableStream on first access (lazy).
   * Accumulation of text/usage and event emissions happen inline
   * during stream consumption.
   */
  private _createStream(): ReadableStream<Uint8Array> {
    if (this._started) {
      throw new Error(
        "StreamTextResult can only be consumed once. " +
          "Pick one: toDataStream(), toReadableStream(), or toAsyncIterable().",
      );
    }
    this._started = true;

    const self = this;
    const source = this._source;
    return new ReadableStream<Uint8Array>({
      async start(controller) {
        const encoder = new TextEncoder();
        try {
          for await (const chunk of source) {
            // Accumulate text/usage inline.
            if (chunk.type === "text-delta") {
              self._text += chunk.delta;
            } else if (chunk.type === "done") {
              self._usage = chunk.usage;
            }
            // Notify .on() listeners.
            self._emit(chunk.type, chunk);
            // Push serialized chunk to the stream.
            controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
          }
          self._textResolve(self._text);
          self._usageResolve(self._usage);
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });
  }

  /**
   * Drain a tee'd branch in the background so text/usage promises
   * resolve even when the user discards the accumulator.
   */
  private _drain(stream: ReadableStream<Uint8Array>): void {
    const reader = stream.getReader();
    // Fire-and-forget — errors surface via the main consumer.
    void (async () => {
      try {
        while (true) {
          const { done } = await reader.read();
          if (done) break;
        }
      } catch {
        /* drain errors are silent */
      }
    })();
  }

  /**
   * Convert a ReadableStream of JSON-line-encoded TurnChunks
   * into SSE format (AI SDK compatible).
   */
  private _encodeSSE(source: ReadableStream<Uint8Array>): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
      start(controller) {
        const encoder = new TextEncoder();
        const reader = source.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        const pump = async () => {
          try {
            while (true) {
              const { value, done } = await reader.read();
              if (done) break;
              buf += decoder.decode(value, { stream: true });
              const lines = buf.split("\n");
              buf = lines.pop() ?? "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const chunk: any = JSON.parse(trimmed);
                  switch (chunk.type) {
                    case "text-delta":
                      controller.enqueue(
                        encoder.encode(`0:${JSON.stringify(chunk.delta)}\n`),
                      );
                      break;
                    case "tool-call-delta":
                    case "tool-call-ready":
                      controller.enqueue(
                        encoder.encode(`9:${JSON.stringify([chunk])}\n`),
                      );
                      break;
                    case "done":
                      controller.enqueue(
                        encoder.encode(
                          `d:${JSON.stringify({ usage: chunk.usage })}\n`,
                        ),
                      );
                      break;
                  }
                } catch {
                  /* skip malformed JSON */
                }
              }
            }
          } catch (err) {
            controller.error(err);
            return;
          }
          controller.close();
        };
        pump();
      },
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _emit(type: string, payload: any): void {
    const handlers = this._listeners.get(type);
    if (!handlers) return;
    for (const fn of handlers) {
      try {
        fn(payload);
      } catch {
        /* silent */
      }
    }
  }
}


