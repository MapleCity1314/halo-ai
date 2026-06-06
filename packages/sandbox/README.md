# @halo-sdk/sandbox

Secure filesystem and command execution for Halo agents. Two implementations: in-memory (cross-platform) and container (real fs + shell).

## Installation

```bash
npm install @halo-sdk/sandbox
```

Requires `@halo-sdk/core` as a peer dependency.

## Quick Start

```ts
import { Halo } from "@halo-sdk/core";
import { ContainerSandbox } from "@halo-sdk/sandbox";

const sandbox = new ContainerSandbox({
  baseDir: "/tmp/agent-workspace",
  execTimeout: 30_000,
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You have a workspace at /tmp/agent-workspace." }],
  tools: sandbox.tools(), // readFile, writeFile, readdir, exec, execShell
  sandbox, // injected into tool execution context
});

await agent.generateText("Create a hello.sh script and run it");
await sandbox.dispose();
```

## Two Implementations

|                      | VirtualSandbox         | ContainerSandbox |
| -------------------- | ---------------------- | ---------------- |
| Storage              | In-memory `Map`        | Real filesystem  |
| `exec` / `execShell` | Not supported          | `child_process`  |
| Target runtime       | Browser / Edge / Tests | Node.js only     |

```ts
// Virtual — ephemeral, cross-platform
import { VirtualSandbox } from "@halo-sdk/sandbox";
const sb = new VirtualSandbox();

// Container — real filesystem + command execution
import { ContainerSandbox } from "@halo-sdk/sandbox";
const sb = new ContainerSandbox({ baseDir: "/tmp/work" });
```

## Filesystem Operations

```ts
await sandbox.writeFile("config.json", JSON.stringify({ port: 3000 }));
const data = await sandbox.readFile("config.json"); // UTF-8 string
const entries = await sandbox.readdir("."); // { name, isDirectory }[]
const exists = await sandbox.exists("tmp/cache"); // boolean
```

## Command Execution (ContainerSandbox)

```ts
// Structured (no shell injection)
const result = await sandbox.exec("echo", ["hello", "world"]);
console.log(result.stdout); // "hello world\n"

// Shell mode (requires explicit opt-in)
const result = await sandbox.execShell("ls -la | grep .ts", { allowShell: true });

// Background with port exposure
const server = await sandbox.exec("node", ["server.js"], {
  background: true,
  exposePort: 0,
});
console.log(server.url); // "http://127.0.0.1:45678"
```

## Security

- **Path isolation** — all paths resolve within `baseDir`. `../` traversals blocked.
- **No shell by default** — `exec()` uses structured arguments.
- **Shell requires explicit opt-in** — `{ allowShell: true }` safety gate.
- **Timeout on every command** — default 30s.

## Documentation

See the [Halo SDK docs](https://halo-sdk.github.io/halo-ai/en/guides/sandbox) for full guides and API reference.
