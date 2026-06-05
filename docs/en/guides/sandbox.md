# Sandbox

Give Halo agents filesystem access and command execution in a secure, isolated environment.

## Quick Start

```ts
import { ContainerSandbox } from "@halo-ai/sandbox";

const sandbox = new ContainerSandbox({
  baseDir: "/tmp/agent-workspace",
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You have a workspace at /tmp/agent-workspace." }],
  tools: sandbox.tools(),
  sandbox,
});

await agent.generateText("Create a hello.sh script and run it");
await sandbox.dispose();
```

## Choosing a Sandbox

**Use VirtualSandbox when:**
- Running in browser or Edge runtime (no `child_process`)
- Testing — ephemeral, no disk cleanup needed
- Agent only needs file read/write, not command execution

**Use ContainerSandbox when:**
- Agent needs to run real commands (`exec`, `execShell`)
- Files must persist across sessions
- Running on Node.js server

```ts
// Virtual — pure in-memory Map, <1ms construction
import { VirtualSandbox } from "@halo-ai/sandbox";
const sb = new VirtualSandbox();

// Container — real fs + child_process, ~3ms construction
import { ContainerSandbox } from "@halo-ai/sandbox";
const sb = new ContainerSandbox({ baseDir: "/tmp/work" });
```

## Filesystem Operations

```ts
await sandbox.writeFile("config.json", JSON.stringify({ port: 3000 }));
const data = await sandbox.readFile("config.json"); // string (UTF-8)

const entries = await sandbox.readdir("."); // { name, isDirectory }[]
const hasFile = await sandbox.exists("config.json"); // boolean
```

`writeFile` auto-creates parent directories. All paths are relative to the sandbox root.

## Command Execution

### Structured exec (no shell)

```ts
const result = await sandbox.exec("echo", ["hello", "world"], {
  cwd: "subdir",
  env: { DEBUG: "1" },
  timeout: 10_000,
});
console.log(result.stdout);    // "hello world\n"
console.log(result.exitCode);  // 0
```

### Shell mode (requires opt-in)

```ts
const result = await sandbox.execShell("ls -la | grep '.ts'", {
  allowShell: true, // MUST be true
});
```

### Background processes

```ts
const server = await sandbox.exec("node", ["server.js"], {
  background: true,
  exposePort: 0,          // auto-assign
  bindHost: "127.0.0.1",
  portTTL: 300_000,       // 5 min idle → auto-kill
});

console.log(server.url);  // "http://127.0.0.1:45678"

for await (const line of server.stdout) {
  if (line.includes("ready")) break;
}
```

## Tool Integration

When `sandbox` is passed to `halo.agent()`, tools with two-param `execute` receive it automatically:

```ts
const agent = halo.agent({
  sandbox,
  tools: {
    readConfig: tool({
      description: "Read a config file from the workspace",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
      execute: async ({ path }, ctx) => {
        // ctx.sandbox injected automatically
        return await ctx.sandbox.readFile(path);
      },
    }),
  },
});
```

Single-param `execute` functions are unchanged — backward compatible.

## Security Model

ContainerSandbox enforces several layers:

1. **Path isolation**: All paths resolve within `baseDir`. `../etc/passwd` is blocked. Symlinks outside `baseDir` are blocked via `realpath` check.
2. **No shell by default**: `exec()` uses structured argv — no injection vector.
3. **Shell requires explicit opt-in**: `execShell()` only works with `allowShell: true`.
4. **Timeout on every command**: Protects against runaway processes.
5. **Resource limits**: `cpuLimit`, `memoryLimit`, `maxDiskUsage`, `maxBackgroundProcesses`.

**Do not disable these checks.** They are the security boundary.

## Cache Model

Sandbox objects and their contents never enter `StablePrefix`. Only the `sandbox.tools()` ToolSpec objects enter the prefix (because they're passed to `halo.agent({ tools })`). The sandbox instance itself is cache-transparent.

## Lifecycle

```ts
// Manual cleanup:
await sandbox.dispose(); // Kill all processes. Does NOT delete files.

// Auto (TS 5.2+):
{
  await using sandbox = new ContainerSandbox({ baseDir: "/tmp/work" });
  // ... use sandbox ...
} // dispose() called automatically
```

`dispose()` sends SIGKILL to all background processes. Files on disk persist — delete them separately if needed.
