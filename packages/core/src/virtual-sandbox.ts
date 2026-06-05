import { posix as pathPosix } from "node:path";
import type { ToolDefinition } from "./types.js";
import type { Sandbox } from "./sandbox.js";
import { SandboxError } from "./sandbox.js";

/**
 * In-memory virtual filesystem implementing the Sandbox interface.
 *
 * Files are stored in a `Map<string, string>`. No persistence, no exec.
 * Suitable for browsers, Edge Runtime, and tests.
 */
export class VirtualSandbox implements Sandbox {
  readonly cwd = "/sandbox";
  readonly hasExec = false;

  private _files = new Map<string, string>();
  private _dirs = new Set<string>();

  // ── File ops ──

  async readFile(path: string): Promise<string> {
    const normalized = this._resolve(path);
    const content = this._files.get(normalized);
    if (content === undefined) {
      throw new SandboxError(`ENOENT: ${path}`, "ENOENT");
    }
    return content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    const normalized = this._resolve(path);
    // Auto-create parent directories.
    const parent = normalized.slice(0, normalized.lastIndexOf("/"));
    if (parent) this._ensureDir(parent);
    this._files.set(normalized, content);
  }

  async readdir(
    path: string,
  ): Promise<{ name: string; isDirectory: boolean }[]> {
    const normalized = this._resolve(path);
    if (!this._dirs.has(normalized) && !this._hasFileInDir(normalized)) {
      throw new SandboxError(`ENOENT: ${path}`, "ENOENT");
    }

    const prefix = normalized === "/" ? "/" : normalized + "/";
    const seen = new Set<string>();
    const entries: { name: string; isDirectory: boolean }[] = [];

    for (const key of this._files.keys()) {
      if (!key.startsWith(prefix)) continue;
      const relative = key.slice(prefix.length);
      const name = relative.split("/")[0]!;
      if (seen.has(name)) continue;
      seen.add(name);
      entries.push({ name, isDirectory: false });
    }

    for (const dir of this._dirs) {
      if (!dir.startsWith(prefix) || dir === normalized) continue;
      const relative = dir.slice(prefix.length);
      const name = relative.split("/")[0]!;
      if (seen.has(name)) continue;
      seen.add(name);
      entries.push({ name, isDirectory: true });
    }

    return entries;
  }

  async exists(path: string): Promise<boolean> {
    try {
      const normalized = this._resolve(path);
      return this._files.has(normalized) || this._dirs.has(normalized);
    } catch {
      return false;
    }
  }

  // ── Lifecycle ──

  async dispose(): Promise<void> {
    this._files.clear();
    this._dirs.clear();
  }

  // ── Tools ──

  tools(): Record<string, ToolDefinition> {
    const sandbox: Sandbox = this;
    return {
      readFile: {
        description: "Read a file from the sandbox filesystem",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
          },
          required: ["path"],
        },
        execute: (args) => sandbox.readFile(String(args.path)),
      },
      writeFile: {
        description: "Write content to a file in the sandbox",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "File path" },
            content: { type: "string", description: "Content to write" },
          },
          required: ["path", "content"],
        },
        execute: (args) =>
          sandbox.writeFile(String(args.path), String(args.content)).then(() => "File written."),
      },
      readdir: {
        description: "List files and directories in a sandbox directory",
        parameters: {
          type: "object",
          properties: {
            path: { type: "string", description: "Directory path" },
          },
          required: ["path"],
        },
        execute: async (args) => {
          const entries = await sandbox.readdir(String(args.path));
          return JSON.stringify(entries);
        },
      },
    };
  }

  // ── Private ──

  private _resolve(p: string): string {
    const resolved = pathPosix.resolve(this.cwd, p);
    const cwd = this.cwd as string;
    if (!resolved.startsWith(cwd === "/" ? "/" : cwd + "/") &&
        resolved !== cwd) {
      throw new SandboxError(`EACCES: ${p}`, "EACCES");
    }
    return resolved;
  }

  private _ensureDir(p: string): void {
    if (p === "/" || p === "" || this._dirs.has(p)) return;
    this._ensureDir(pathPosix.dirname(p));
    this._dirs.add(p);
  }

  private _hasFileInDir(dir: string): boolean {
    const prefix = (dir as string) === "/" ? "/" : dir + "/";
    for (const key of this._files.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }
}
