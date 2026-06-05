# `Sandbox`

Filesystem and command execution interface for Halo agents. Never enters `StablePrefix` — safe to change without cache miss.

## Import

```ts
import { VirtualSandbox, ContainerSandbox } from "@halo-ai/sandbox";
// Types:
import type { Sandbox, ToolContext, ExecOptions, ExecResult } from "@halo-ai/core";
```

## Interface

```ts
interface Sandbox {
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  readdir(path: string): Promise<{ name: string; isDirectory: boolean }[]>;
  exists(path: string): Promise<boolean>;

  exec?(command: string, args: string[], opts?: ExecOptions): Promise<ExecResult>;
  execShell?(command: string, opts?: ExecShellOptions): Promise<ExecResult>;

  dispose(): Promise<void>;

  readonly cwd: string;
  readonly hasExec: boolean;

  tools(): Record<string, ToolDefinition>;
}
```

## Two Implementations

| | VirtualSandbox | ContainerSandbox |
|---|---|---|
| `readFile` / `writeFile` / `readdir` | In-memory `Map` | Real filesystem |
| `exec` / `execShell` | Not supported | `child_process` |
| Persistence | Gone after `dispose()` | On-disk |
| Runtime | Browser / Edge / Tests | Node.js only |

```ts
// Virtual — ephemeral, cross-platform
const sb = new VirtualSandbox();

// Container — real fs + commands, Node only
const sb = new ContainerSandbox({
  baseDir: "/tmp/workspace",
  execTimeout: 30_000,
});
```

## Configuration

### ContainerConfig

```ts
interface ContainerConfig {
  baseDir: string;                  // Required — sandbox root
  env?: Record<string, string>;     // Extra env vars for child processes
  execTimeout?: number;             // Default 30_000 (30s)
  cpuLimit?: string;                // Linux cgroup, e.g. "50%"
  memoryLimit?: string;             // Linux cgroup, e.g. "512MB"
  maxDiskUsage?: string;            // Rejects writeFile over limit
  maxBackgroundProcesses?: number;  // Default 3
  allowOutbound?: boolean;          // Default true
  allowedHosts?: string[];          // Outbound whitelist
}
```

## Execution Types

### ExecOptions

```ts
interface ExecOptions {
  cwd?: string;               // Relative to baseDir
  env?: Record<string, string>;
  timeout?: number;           // Override default
  background?: boolean;       // false: wait; true: return ProcessHandle
  exposePort?: number;        // 0 = auto-assign
  bindHost?: string;          // Default "127.0.0.1"
  portTTL?: number;           // Auto-kill after ms idle, default 300_000
  portAuth?: { type: "token"; value: string };
}
```

### ExecShellOptions

```ts
interface ExecShellOptions extends ExecOptions {
  allowShell: boolean;        // MUST be true — safety gate
}
```

### ExecResult

```ts
interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}
```

### ProcessHandle

```ts
interface ProcessHandle {
  pid: number;
  url?: string;                      // When exposePort is set
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  kill(signal?: string): Promise<void>;
  wait(): Promise<ExecResult>;
}
```

## ToolContext

Injected as the second argument to `execute()` when the agent has a sandbox:

```ts
interface ToolContext {
  sandbox: Sandbox;
}

// Single-param execute — no sandbox (backward compatible)
execute: async (args) => { ... }

// Dual-param execute — receives sandbox automatically
execute: async (args, ctx) => {
  const content = await ctx.sandbox.readFile(args.path);
  return content;
}
```

Detection is runtime via `execute.length`. Existing code is unaffected.

## Auto-Generated Tools

`sandbox.tools()` returns `ToolDefinition` objects:

**VirtualSandbox**: `readFile`, `writeFile`, `readdir`

**ContainerSandbox** (same +): `exec`, `execShell`, `httpGet`

Spread into agent tools:

```ts
const agent = halo.agent({
  tools: { ...sandbox.tools(), ...myCustomTools },
  sandbox,
});
```

## Security

- **Path isolation**: All paths resolve within `baseDir`. `../` traversals and symlinks outside `baseDir` are blocked.
- **No shell by default**: `exec()` uses structured arguments — no injection.
- **`execShell()` requires `allowShell: true`** — explicit gate.
- **Timeout on every command**: Default 30s.
- **`dispose()` kills all background processes**: SIGKILL after grace period.
