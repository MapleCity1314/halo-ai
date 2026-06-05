import * as path from "node:path";
import * as fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import { createInterface } from "node:readline";
import type { ToolDefinition } from "./types.js";
import type {
  Sandbox,
  ExecOptions,
  ExecShellOptions,
  ExecResult,
  ProcessHandle,
} from "./sandbox.js";
import { SandboxError } from "./sandbox.js";

// ── Config ──

export interface ContainerConfig {
  /** Root directory — all file access is jailed under this path. */
  baseDir: string;
  /** Inject into child process environments. */
  env?: Record<string, string>;
  /** Default exec timeout (ms). */
  execTimeout?: number;
  /** Max concurrent background processes. */
  maxBackgroundProcesses?: number;
}

// ── ContainerSandbox ──

export class ContainerSandbox implements Sandbox {
  readonly cwd: string;
  readonly hasExec = true;

  private _baseDir: string;
  private _config: ContainerConfig;
  private _processes = new Map<number, ChildProcess>();

  constructor(opts: ContainerConfig) {
    this._baseDir = path.resolve(opts.baseDir);
    this.cwd = this._baseDir;
    this._config = opts;

    // Ensure baseDir exists.
    fs.mkdirSync(this._baseDir, { recursive: true });
  }

  // ── File ops ──

  async readFile(p: string): Promise<string> {
    return fs.promises.readFile(this._resolve(p), "utf-8");
  }

  async writeFile(p: string, content: string): Promise<void> {
    const target = this._resolve(p);
    await fs.promises.mkdir(path.dirname(target), { recursive: true });
    await fs.promises.writeFile(target, content, "utf-8");
  }

  async readdir(p: string): Promise<{ name: string; isDirectory: boolean }[]> {
    const target = this._resolve(p);
    const entries = await fs.promises.readdir(target, { withFileTypes: true });
    return entries.map((e) => ({
      name: e.name,
      isDirectory: e.isDirectory(),
    }));
  }

  async exists(p: string): Promise<boolean> {
    try {
      this._resolve(p);
      return true;
    } catch {
      return false;
    }
  }

  // ── Exec ──

  async exec(
    command: string,
    args: string[],
    opts?: ExecOptions,
  ): Promise<ExecResult> {
    const cwd = opts?.cwd ? this._resolve(opts.cwd) : this.cwd;
    const timeout = opts?.timeout ?? this._config.execTimeout ?? 30_000;

    return new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd,
        env: { ...process.env, ...this._config.env, ...opts?.env },
        stdio: ["ignore", "pipe", "pipe"],
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new SandboxError(`exec timed out after ${timeout}ms`, "TIMEOUT"));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new SandboxError(`exec failed: ${err.message}`, "EXEC_ERROR"));
      });
    });
  }

  async execShell(
    command: string,
    opts?: ExecShellOptions,
  ): Promise<ExecResult> {
    if (!opts?.allowShell) {
      throw new SandboxError(
        "execShell requires allowShell: true",
        "EACCES",
      );
    }

    const cwd = opts?.cwd ? this._resolve(opts.cwd) : this.cwd;
    const timeout = opts?.timeout ?? this._config.execTimeout ?? 30_000;

    return new Promise((resolve, reject) => {
      const child = spawn(command, [], {
        cwd,
        env: { ...process.env, ...this._config.env, ...opts?.env },
        stdio: ["ignore", "pipe", "pipe"],
        shell: true,
      });

      let stdout = "";
      let stderr = "";

      child.stdout?.on("data", (d: Buffer) => (stdout += d.toString()));
      child.stderr?.on("data", (d: Buffer) => (stderr += d.toString()));

      const timer = setTimeout(() => {
        child.kill("SIGTERM");
        reject(new SandboxError(`exec timed out after ${timeout}ms`, "TIMEOUT"));
      }, timeout);

      child.on("close", (code) => {
        clearTimeout(timer);
        resolve({ stdout, stderr, exitCode: code ?? 1 });
      });

      child.on("error", (err) => {
        clearTimeout(timer);
        reject(new SandboxError(`exec failed: ${err.message}`, "EXEC_ERROR"));
      });
    });
  }

  // ── Lifecycle ──

  async dispose(): Promise<void> {
    for (const child of this._processes.values()) {
      try {
        child.kill("SIGKILL");
      } catch {
        /* already dead */
      }
    }
    this._processes.clear();
  }

  [Symbol.dispose](): void {
    void this.dispose();
  }

  // ── Tools (full set) ──

  tools(): Record<string, ToolDefinition> {
    const sandbox: Sandbox = this;
    return {
      readFile: {
        description: "Read a file from the sandbox filesystem",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
        execute: (args) => sandbox.readFile!(String(args.path)),
      },
      writeFile: {
        description: "Write content to a file in the sandbox",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string" },
            content: { type: "string" },
          },
          required: ["path", "content"],
        },
        execute: (args) =>
          sandbox
            .writeFile!(String(args.path), String(args.content))
            .then(() => "File written."),
      },
      readdir: {
        description: "List files and directories in a sandbox directory",
        parameters: {
          type: "object",
          properties: { path: { type: "string" } },
          required: ["path"],
        },
        execute: async (args) => {
          const entries = await sandbox.readdir(String(args.path));
          return JSON.stringify(entries);
        },
      },
      exec: {
        description:
          "Execute a command in the sandbox. Returns stdout and stderr.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string", description: "Command to run" },
            args: {
              type: "array",
              items: { type: "string" },
              description: "Arguments",
            },
            cwd: { type: "string", description: "Working directory" },
            timeout: { type: "number", description: "Timeout in ms" },
          },
          required: ["command"],
        },
        execute: async (a) => {
          const r = await sandbox.exec!(String(a.command), (a.args as string[]) ?? [], {
            cwd: a.cwd ? String(a.cwd) : undefined,
            timeout: a.timeout ? Number(a.timeout) : undefined,
          });
          return r.exitCode === 0
            ? r.stdout
            : `exit=${r.exitCode}\n${r.stdout}\n${r.stderr}`;
        },
      },
      execShell: {
        description:
          "Execute a shell command string. Shell operators (|, >, &&) are supported.",
        parameters: {
          type: "object",
          properties: {
            command: { type: "string" },
            cwd: { type: "string" },
            timeout: { type: "number" },
          },
          required: ["command"],
        },
        execute: async (a) => {
          const r = await sandbox.execShell!(String(a.command), {
            allowShell: true,
            cwd: a.cwd ? String(a.cwd) : undefined,
            timeout: a.timeout ? Number(a.timeout) : undefined,
          });
          return r.exitCode === 0
            ? r.stdout
            : `exit=${r.exitCode}\n${r.stdout}\n${r.stderr}`;
        },
      },
    };
  }

  // ── Private ──

  /** Resolve + validate path: prevent traversal outside baseDir. */
  private _resolve(p: string): string {
    const resolved = path.resolve(this._baseDir, p);

    // Handle missing paths gracefully (realpathSync fails on non-existent).
    let realPath: string;
    try {
      realPath = fs.realpathSync(resolved);
    } catch {
      // Path doesn't exist yet (e.g. for writeFile). Normalize and check.
      const normalized = path.resolve(resolved);
      if (
        !normalized.startsWith(this._baseDir + path.sep) &&
        normalized !== this._baseDir
      ) {
        throw new SandboxError(`Path traversal blocked: ${p}`, "EACCES");
      }
      return resolved;
    }

    if (
      !realPath.startsWith(this._baseDir + path.sep) &&
      realPath !== this._baseDir
    ) {
      throw new SandboxError(`Path traversal blocked: ${p}`, "EACCES");
    }

    return realPath;
  }
}
