import type { ToolDefinition } from "./types.js";

// ── Sandbox interface ──

export interface Sandbox {
  /** Read file contents as UTF-8. */
  readFile(path: string): Promise<string>;

  /** Write or overwrite a file. Creates parent directories automatically. */
  writeFile(path: string, content: string): Promise<void>;

  /** List directory entries. */
  readdir(path: string): Promise<{ name: string; isDirectory: boolean }[]>;

  /** Check if a path exists. */
  exists(path: string): Promise<boolean>;

  /** Execute a command with structured arguments (no shell). */
  exec?(command: string, args: string[], opts?: ExecOptions): Promise<ExecResult>;

  /** Execute a shell command string. Requires `allowShell: true`. */
  execShell?(command: string, opts?: ExecShellOptions): Promise<ExecResult>;

  /** Kill all background processes and clean up. Idempotent. */
  dispose(): Promise<void>;

  /** Working directory — all relative paths resolve against this. */
  readonly cwd: string;

  /** Whether this sandbox supports command execution. */
  readonly hasExec: boolean;

  /**
   * Auto-generate tool definitions matching this sandbox's capabilities.
   * VirtualSandbox: { readFile, writeFile, readdir }
   * ContainerSandbox: + { exec, execShell }
   */
  tools(): Record<string, ToolDefinition>;
}

// ── Execution types ──

export interface ExecOptions {
  /** Working directory for the command (relative to sandbox root). */
  cwd?: string;
  /** Additional environment variables. */
  env?: Record<string, string>;
  /** Timeout in ms. Default 30s. */
  timeout?: number;
  /** If true, returns ProcessHandle instead of waiting. */
  background?: boolean;
  /** Expose a port (0 = auto-assign). Requires background: true. */
  exposePort?: number;
  /** Host to bind. Default "127.0.0.1". */
  bindHost?: string;
  /** Auto-kill after ms of inactivity. Default 300_000 (5 min). */
  portTTL?: number;
  /** Authentication for exposed port. */
  portAuth?: { type: "token"; value: string };
}

export interface ExecShellOptions extends ExecOptions {
  /** Must be explicitly true to use shell mode. */
  allowShell: boolean;
}

export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface ProcessHandle {
  pid: number;
  /** URL when exposePort was set. */
  url?: string;
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  kill(signal?: string): Promise<void>;
  wait(): Promise<ExecResult>;
}

// ── Error ──

export class SandboxError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = "SandboxError";
    this.code = code;
  }
}

// ── Tool context ──

/** Second argument passed to tool execute() when the agent has a sandbox. */
export interface ToolContext {
  sandbox: Sandbox;
}
