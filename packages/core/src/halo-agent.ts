import type { ChatMessage, ToolCall, ToolDefinition, ToolSpec } from "./types.js";
import type {
  TurnResult,
  TurnChunk,
  ToolResult,
  SessionStats,
  HaloAgentOptions,
  StreamTextOptions,
  StreamTextResult,
  GenerateObjectOptions,
  GenerateObjectResult,
} from "./session.js";
import type { ModelCallOptions } from "./model-adapter.js";
import { HaloAgentImpl } from "./session-impl.js";

/**
 * A cache-aware AI agent with automatic tool-call loop.
 *
 * Create one via `new HaloAgent(opts)` or `halo.agent(opts)`.
 * Each agent maintains a stable prefix (system prompt + tools + few-shots)
 * that enables prefix caching across turns.
 */
export class HaloAgent {
  private _impl: HaloAgentImpl;

  constructor(opts: HaloAgentOptions) {
    this._impl = new HaloAgentImpl(opts);
  }

  // ── Core ──

  /** Read-only agent statistics. Updated after every turn. */
  get stats(): Readonly<SessionStats> {
    return this._impl.stats;
  }

  /**
   * Run a prompt with automatic tool-call loop.
   * This is the default entry point for 80% of use-cases.
   */
  async run(
    input: string,
    opts?: {
      maxSteps?: number;
      onToolCall?: (call: ToolCall) => Promise<ToolResult>;
      onStep?: (step: { step: number; content: string; toolCalls: ToolCall[] }) => void;
    } & ModelCallOptions,
  ): Promise<TurnResult> {
    return this._impl.run(input, opts);
  }

  /**
   * Send a message. Tool calls are returned, NOT automatically executed.
   * Use submitToolResult() to feed results back.
   */
  async send(input: string, options?: ModelCallOptions): Promise<TurnResult> {
    return this._impl.send(input, options);
  }

  /** Stream a message. */
  async *stream(input: string, options?: ModelCallOptions): AsyncGenerator<TurnChunk> {
    yield* this._impl.stream(input, options);
  }

  /**
   * Streaming entry with full tool-call loop and named callbacks.
   *
   * Accepts a string (plain input) or `ChatMessage[]` (AI SDK useChat integration).
   * Returns a `StreamTextResult` with multiple consumption paths.
   */
  streamText(
    input: string | ChatMessage[],
    opts?: StreamTextOptions,
  ): StreamTextResult {
    return this._impl.streamText(input, opts);
  }

  /**
   * Generate a structured object from a prompt.
   *
   * Accepts Zod schemas (compile-time type inference) or plain JSON Schema.
   * Schema is sent as `responseFormat` — does NOT enter StablePrefix.
   * Tools are suppressed for this call.
   */
  async generateObject<T = unknown>(
    input: string,
    opts: GenerateObjectOptions<unknown>,
  ): Promise<GenerateObjectResult<T>> {
    return this._impl.generateObject<T>(input, opts);
  }

  /**
   * Stream a progressively-built object from a prompt.
   *
   * Yields incremental partial objects as the JSON builds up.
   */
  streamObject<T = unknown>(
    input: string,
    opts: GenerateObjectOptions<unknown>,
  ): AsyncGenerator<T> {
    return this._impl.streamObject<T>(input, opts);
  }

  /** Submit a tool execution result. Triggers another model call. */
  async submitToolResult(result: ToolResult, options?: ModelCallOptions): Promise<TurnResult> {
    return this._impl.submitToolResult(result, options);
  }

  /**
   * Stream-compatible entry for AI SDK (useChat) integration.
   *
   * Accepts UIMessages from `useChat()`, hydrates prior history,
   * and streams the response. When tools with `execute` are present,
   * the full tool-call loop runs automatically via `run()`.
   */
  async *sdkStream(
    messages: { role: string; content: string }[],
  ): AsyncGenerator<TurnChunk> {
    yield* this._impl.sdkStream(messages);
  }

  // ── Prefix ──

  /** Add a tool to the agent. Triggers cache miss for the NEXT turn only. */
  addTool(spec: ToolSpec): void;
  /** Add a named tool with an optional execute function. */
  addTool(name: string, def: ToolDefinition): void;
  addTool(specOrName: ToolSpec | string, def?: ToolDefinition): void {
    if (typeof specOrName === "string") {
      this._impl.addTool(specOrName, def!);
    } else {
      this._impl.addTool(specOrName);
    }
  }
  /** Remove a tool. Same cache-miss semantics. */
  removeTool(name: string): void {
    this._impl.removeTool(name);
  }
  /** Add a few-shot example. Same cache-miss semantics. */
  addFewShot(msg: ChatMessage): void {
    this._impl.addFewShot(msg);
  }
  /** Remove a few-shot example by index. */
  removeFewShot(index: number): boolean {
    return this._impl.removeFewShot(index);
  }

  // ── Keep-alive ──

  /**
   * Start a keep-alive timer that sends periodic pings to maintain
   * server-side KV cache warmth. Call stop() when the long-running
   * task is done.
   */
  keepAlive(intervalMs?: number): { stop: () => void } {
    return this._impl.keepAlive(intervalMs);
  }

  // ── Hydrate ──

  /** Restore conversation state from external history (e.g. previous API calls). */
  hydrate(messages: ChatMessage[]): void {
    this._impl.hydrate(messages);
  }

  // ── Lifecycle ──

  /** Clear conversation history without changing the prefix. */
  clearLog(): void {
    this._impl.clearLog();
  }
  /** Change the system prompt. Triggers cache miss. */
  setSystem(system: string): void {
    this._impl.setSystem(system);
  }
}
