import type { ChatMessage, ToolCall, ToolSpec } from "./types.js";
import type {
  TurnResult,
  TurnChunk,
  ToolResult,
  SessionStats,
  HaloSessionOptions,
} from "./session.js";
import { HaloSessionImpl } from "./session-impl.js";

/**
 * Public API for a single cache-aware conversation session.
 *
 * Create one via `new HaloSession(opts)` or `halo.session(opts)`.
 * Each session maintains a stable prefix (system prompt + tools + few-shots)
 * that enables DeepSeek's prefix caching across turns.
 */
export class HaloSession {
  private _impl: HaloSessionImpl;

  constructor(opts: HaloSessionOptions) {
    this._impl = new HaloSessionImpl(opts);
  }

  // ── Core ──

  /** Read-only session statistics. Updated after every turn. */
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
    },
  ): Promise<TurnResult> {
    return this._impl.run(input, opts);
  }

  /**
   * Send a message. Tool calls are returned, NOT automatically executed.
   * Use submitToolResult() to feed results back.
   */
  async send(input: string): Promise<TurnResult> {
    return this._impl.send(input);
  }

  /** Stream a message. */
  async *stream(input: string): AsyncGenerator<TurnChunk> {
    yield* this._impl.stream(input);
  }

  /** Submit a tool execution result. Triggers another model call. */
  async submitToolResult(result: ToolResult): Promise<TurnResult> {
    return this._impl.submitToolResult(result);
  }

  // ── Prefix ──

  /** Add a tool to the session. Triggers cache miss for the NEXT turn only. */
  addTool(spec: ToolSpec): void {
    this._impl.addTool(spec);
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
