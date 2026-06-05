import * as path from "node:path";
import * as fs from "node:fs";
import { spawn, type ChildProcess } from "node:child_process";
import type { ToolDefinition, Sandbox, ExecOptions, ExecShellOptions, ExecResult } from "@halo-sdk/core";
import { SandboxError } from "@halo-sdk/core";

export interface ContainerConfig {
  baseDir: string;
  env?: Record<string, string>;
  execTimeout?: number;
  maxBackgroundProcesses?: number;
}

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
    fs.mkdirSync(this._baseDir, { recursive: true });
  }

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
    return entries.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
  }

  async exists(p: string): Promise<boolean> {
    try { this._resolve(p); return true; } catch { return false; }
  }

  async exec(command: string, args: string[], opts?: ExecOptions): Promise<ExecResult> {
    const cwd = opts?.cwd ? this._resolve(opts.cwd) : this.cwd;
    const timeout = opts?.timeout ?? this._config.execTimeout ?? 30_000;
    return new Promise((resolve, reject) => {
      const child = spawn(command, args, { cwd, env: { ...process.env, ...this._config.env, ...opts?.env }, stdio: ["ignore", "pipe", "pipe"] });
      let stdout = "", stderr = "";
      child.stdout?.on("data", (d: Buffer) => stdout += d.toString());
      child.stderr?.on("data", (d: Buffer) => stderr += d.toString());
      const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new SandboxError(`exec timed out after ${timeout}ms`, "TIMEOUT")); }, timeout);
      child.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 1 }); });
      child.on("error", (err) => { clearTimeout(timer); reject(new SandboxError(`exec failed: ${err.message}`, "EXEC_ERROR")); });
    });
  }

  async execShell(command: string, opts?: ExecShellOptions): Promise<ExecResult> {
    if (!opts?.allowShell) throw new SandboxError("execShell requires allowShell: true", "EACCES");
    const cwd = opts?.cwd ? this._resolve(opts.cwd) : this.cwd;
    const timeout = opts?.timeout ?? this._config.execTimeout ?? 30_000;
    return new Promise((resolve, reject) => {
      const child = spawn(command, [], { cwd, env: { ...process.env, ...this._config.env, ...opts?.env }, stdio: ["ignore", "pipe", "pipe"], shell: true });
      let stdout = "", stderr = "";
      child.stdout?.on("data", (d: Buffer) => stdout += d.toString());
      child.stderr?.on("data", (d: Buffer) => stderr += d.toString());
      const timer = setTimeout(() => { child.kill("SIGTERM"); reject(new SandboxError(`exec timed out after ${timeout}ms`, "TIMEOUT")); }, timeout);
      child.on("close", (code) => { clearTimeout(timer); resolve({ stdout, stderr, exitCode: code ?? 1 }); });
      child.on("error", (err) => { clearTimeout(timer); reject(new SandboxError(`exec failed: ${err.message}`, "EXEC_ERROR")); });
    });
  }

  async dispose(): Promise<void> {
    for (const child of this._processes.values()) try { child.kill("SIGKILL"); } catch { /* */ }
    this._processes.clear();
  }

  [Symbol.dispose](): void { void this.dispose(); }

  tools(): Record<string, ToolDefinition> {
    const sb: Sandbox = this;
    return {
      readFile: { description: "Read a file from the sandbox filesystem", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, execute: (a: Record<string, unknown>) => sb.readFile(String(a.path)) },
      writeFile: { description: "Write content to a file in the sandbox", parameters: { type: "object", properties: { path: { type: "string" }, content: { type: "string" } }, required: ["path", "content"] }, execute: (a: Record<string, unknown>) => sb.writeFile(String(a.path), String(a.content)).then(() => "File written.") },
      readdir: { description: "List files and directories in a sandbox directory", parameters: { type: "object", properties: { path: { type: "string" } }, required: ["path"] }, execute: async (a: Record<string, unknown>) => JSON.stringify(await sb.readdir(String(a.path))) },
      exec: { description: "Execute a command in the sandbox", parameters: { type: "object", properties: { command: { type: "string" }, args: { type: "array", items: { type: "string" } }, cwd: { type: "string" }, timeout: { type: "number" } }, required: ["command"] }, execute: async (a: Record<string, unknown>) => { const r = await sb.exec!(String(a.command), (a.args as string[]) ?? [], { cwd: a.cwd ? String(a.cwd) : undefined, timeout: a.timeout ? Number(a.timeout) : undefined }); return r.exitCode === 0 ? r.stdout : `exit=${r.exitCode}\n${r.stdout}\n${r.stderr}`; } },
      execShell: { description: "Execute a shell command string", parameters: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" }, timeout: { type: "number" } }, required: ["command"] }, execute: async (a: Record<string, unknown>) => { const r = await sb.execShell!(String(a.command), { allowShell: true, cwd: a.cwd ? String(a.cwd) : undefined, timeout: a.timeout ? Number(a.timeout) : undefined }); return r.exitCode === 0 ? r.stdout : `exit=${r.exitCode}\n${r.stdout}\n${r.stderr}`; } },
    };
  }

  private _resolve(p: string): string {
    const resolved = path.resolve(this._baseDir, p);
    let realPath: string;
    try { realPath = fs.realpathSync(resolved); } catch {
      const n = path.resolve(resolved);
      if (!n.startsWith(this._baseDir + path.sep) && n !== this._baseDir) throw new SandboxError(`Path traversal blocked: ${p}`, "EACCES");
      return resolved;
    }
    if (!realPath.startsWith(this._baseDir + path.sep) && realPath !== this._baseDir) throw new SandboxError(`Path traversal blocked: ${p}`, "EACCES");
    return realPath;
  }
}
