---
name: halo-sandbox
description: Use when giving a Halo agent filesystem access or command execution capabilities. Triggers on: "sandbox", "VirtualSandbox", "ContainerSandbox", "agent file access", "code execution sandbox", "sandbox tools", "container sandbox", "secure execution", "agent exec command", "sandboxed file system".
---

# Sandbox

Provide Halo agents with filesystem access and command execution in a secure, isolated environment. Sandboxes never enter `StablePrefix` — no cache penalty for creating or switching them.

## Two Implementations

| | VirtualSandbox | ContainerSandbox |
|---|---|---|
| `readFile` / `writeFile` / `readdir` | In-memory `Map` | Real filesystem |
| `exec` / `execShell` | Not supported | Real `child_process` |
| Persistence | Gone after `dispose()` | On-disk |
| Target runtime | Browser / Edge / Tests | Node.js only |
| Construction time | <1ms | ~3ms |

**Rule of thumb:** Use `VirtualSandbox` for testing, browser, and ephemeral workspaces. Use `ContainerSandbox` when the agent needs to run real commands or persist files across sessions.

## Quick Start

```ts
import { ContainerSandbox } from "@halo-sdk/sandbox";
// or: import { VirtualSandbox } from "@halo-sdk/sandbox";

const sandbox = new ContainerSandbox({
  baseDir: "/tmp/agent-workspace",
  execTimeout: 30_000,       // default command timeout
  maxBackgroundProcesses: 3,
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You have a workspace at /tmp/agent-workspace." }],
  tools: sandbox.tools(),     // auto-generated ToolDefinition set
  sandbox,                    // injected into tool execution context
});

await agent.generateText("Write a hello.sh script and run it.");
await sandbox.dispose();
```

## Filesystem API

```ts
await sandbox.readFile("config.json");          // → string (UTF-8)
await sandbox.writeFile("output.txt", "data");   // Creates parents automatically
await sandbox.readdir("src");                    // → { name: string, isDirectory: boolean }[]
await sandbox.exists("tmp/cache");               // → boolean
```

## Command Execution (ContainerSandbox only)

### Structured exec (recommended)

```ts
const result = await sandbox.exec("echo", ["hello", "world"], {
  cwd: "subdir",                 // relative to baseDir
  env: { DEBUG: "1" },           // extra env vars
  timeout: 10_000,               // override default
});

console.log(result.stdout);      // "hello world\n"
console.log(result.stderr);      // ""
console.log(result.exitCode);    // 0
```

### Shell mode (requires explicit opt-in)

```ts
const result = await sandbox.execShell("ls -la | grep '.ts'", {
  allowShell: true,              // MUST be true — safety gate
  timeout: 5_000,
});
```

### Background processes with port exposure

```ts
const handle = await sandbox.exec("node", ["server.js"], {
  background: true,
  exposePort: 0,                 // 0 = auto-assign port
  bindHost: "127.0.0.1",         // default, only localhost
  portTTL: 300_000,              // auto-kill after 5 min idle
  portAuth: { type: "token", value: "secret123" },
});

console.log(handle.url);         // "http://127.0.0.1:45678?token=secret123"

for await (const line of handle.stdout) {
  if (line.includes("ready")) break;
}

await handle.kill("SIGTERM");
```

## Security: Path Isolation

`ContainerSandbox` hard-enforces that all paths resolve within `baseDir`:

- `../../etc/passwd` → blocked (path traversal)
- Symlinks pointing outside `baseDir` → blocked (realpath check)
- Absolute paths outside `baseDir` → blocked

```ts
// All of these throw SandboxError("EACCES"):
await sandbox.readFile("../../../etc/passwd");
await sandbox.writeFile("/etc/cron.d/job", "...");
await sandbox.exec("cat", ["/etc/shadow"]);
```

Do NOT disable or work around these checks. They are the security boundary.

## Security: Command Hardening

- **No shell by default.** `exec()` uses structured arguments — no shell injection.
- **`execShell()` requires `allowShell: true`.** The explicit flag prevents accidental shell mode.
- **Timeout on every command.** Default 30s. Override with `timeout` in ExecOptions.
- **Process lifecycle.** `dispose()` sends SIGKILL to all background processes.

## Auto-Generated Tools

`sandbox.tools()` returns `Record<string, ToolDefinition>` with `execute` handlers wired to the sandbox:

**VirtualSandbox.tools():**
```ts
{
  readFile:  ToolDefinition<{ path: string }>,
  writeFile: ToolDefinition<{ path: string, content: string }>,
  readdir:   ToolDefinition<{ path: string }>,
}
```

**ContainerSandbox.tools()** — same +:
```ts
{
  exec:      ToolDefinition<{ command: string, args: string[], cwd?: string, ... }>,
  execShell: ToolDefinition<{ command: string, allowShell: boolean, ... }>,
  httpGet:   ToolDefinition<{ url: string, headers?: Record<string, string> }>,
}
```

`httpGet` is available for agents that start a background server via `exec()` with `exposePort` — it knows the sandbox's port mapping.

Spread these into your agent's tools:

```ts
const agent = halo.agent({
  messages: [...],
  tools: {
    ...sandbox.tools(),
    myCustomTool: { ... },  // your own tools
  },
  sandbox,
});
```

## ToolContext Injection

Tools with `execute(args, ctx)` receive the sandbox automatically:

```ts
const myTool = tool<{ path: string }>({
  description: "Read and summarize a file",
  parameters: { ... },
  execute: async ({ path }, ctx) => {
    // ctx.sandbox is available without the user passing it manually
    const content = await ctx.sandbox.readFile(path);
    return summarize(content);
  },
});
```

**Detection:** The agent checks `execute.length` at runtime. If it's ≥ 2, the sandbox is passed as the second argument. Single-parameter `execute` functions are unaffected — backward compatible.

## Skills + Sandbox

`discoverSkills()` accepts an optional sandbox parameter. When provided, file reads go through the sandbox instead of Node `fs`:

```ts
const skills = await discoverSkills({
  directories: [".halo/skills"],
  sandbox,  // cross-platform — works in browser too
});
```

The `loadSkill` tool executor also uses the agent's sandbox when available.

## Resource Limits (ContainerSandbox)

```ts
const sandbox = new ContainerSandbox({
  baseDir: "/tmp/agent-workspace",
  cpuLimit: "50%",               // Linux cgroup — non-Linux: noop warning
  memoryLimit: "512MB",          // Linux cgroup
  maxDiskUsage: "100MB",         // Checked on writeFile, rejects over limit
  maxBackgroundProcesses: 3,     // Rejects exec() with background:true when exceeded
  allowOutbound: true,           // Subprocesses can reach the internet
  allowedHosts: ["api.github.com", "registry.npmjs.org"],  // Outbound whitelist
});
```

## Cleanup

```ts
// Manual:
await sandbox.dispose();  // Kill all processes, clean temp files. Idempotent.

// Auto (TS 5.2+):
{
  await using sandbox = new ContainerSandbox({ baseDir: "/tmp/work" });
  // ... use sandbox ...
} // dispose() called automatically

// Important: dispose() does NOT delete the baseDir or its contents.
// It only kills child processes. Files persist until you delete them.
```

## Cache Model (Zero Impact)

```
StablePrefix (Cached)          Sandbox (Never Cached)
─────────────────────          ─────────────────────
System prompt                  baseDir file contents
Tool specifications            Running subprocesses
Skill metadata                 Port mappings
Model config                   sandbox.tools() execute functions
```

Changing the sandbox or its contents never triggers a cache miss. The `sandbox.tools()` ToolSpec objects enter the prefix when you pass them to `halo.agent({ tools })`, but the sandbox instance itself does not.
