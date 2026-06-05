# `Sandbox`

Halo Agent 的文件系统和命令执行接口。不进入 `StablePrefix` — 修改不会触发缓存失效。

## 导入

```ts
import { VirtualSandbox, ContainerSandbox } from "@halo-ai/sandbox";
// 类型:
import type { Sandbox, ToolContext, ExecOptions, ExecResult } from "@halo-ai/core";
```

## 接口

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

## 两种实现

| | VirtualSandbox | ContainerSandbox |
|---|---|---|
| `readFile` / `writeFile` / `readdir` | 内存 `Map` | 真实文件系统 |
| `exec` / `execShell` | 不支持 | `child_process` |
| 持久化 | `dispose()` 后消失 | 落盘 |
| 运行时 | 浏览器 / Edge / 测试 | 仅 Node.js |

```ts
// Virtual — 纯内存，跨平台
const sb = new VirtualSandbox();

// Container — 真实 fs + 命令执行，仅 Node
const sb = new ContainerSandbox({
  baseDir: "/tmp/workspace",
  execTimeout: 30_000,
});
```

## 配置

### ContainerConfig

```ts
interface ContainerConfig {
  baseDir: string;                  // 必填 — 沙箱根目录
  env?: Record<string, string>;     // 子进程额外环境变量
  execTimeout?: number;             // 默认 30_000 (30s)
  cpuLimit?: string;                // Linux cgroup, 如 "50%"
  memoryLimit?: string;             // Linux cgroup, 如 "512MB"
  maxDiskUsage?: string;            // 超出限制拒绝 writeFile
  maxBackgroundProcesses?: number;  // 默认 3
  allowOutbound?: boolean;          // 默认 true
  allowedHosts?: string[];          // 外网白名单
}
```

## 执行类型

### ExecOptions

```ts
interface ExecOptions {
  cwd?: string;               // 相对于 baseDir
  env?: Record<string, string>;
  timeout?: number;           // 覆盖默认值
  background?: boolean;       // false: 等待; true: 返回 ProcessHandle
  exposePort?: number;        // 0 = 自动分配端口
  bindHost?: string;          // 默认 "127.0.0.1"
  portTTL?: number;           // 空闲毫秒后自动 kill, 默认 300_000
  portAuth?: { type: "token"; value: string };
}
```

### ExecShellOptions

```ts
interface ExecShellOptions extends ExecOptions {
  allowShell: boolean;        // 必须为 true — 安全门
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
  url?: string;                      // exposePort 设置时
  stdout: AsyncIterable<string>;
  stderr: AsyncIterable<string>;
  kill(signal?: string): Promise<void>;
  wait(): Promise<ExecResult>;
}
```

## ToolContext

Agent 有沙箱时，作为第二个参数注入 `execute()`：

```ts
interface ToolContext {
  sandbox: Sandbox;
}

// 单参数 execute — 无沙箱（向后兼容）
execute: async (args) => { ... }

// 双参数 execute — 自动接收沙箱
execute: async (args, ctx) => {
  const content = await ctx.sandbox.readFile(args.path);
  return content;
}
```

运行时通过 `execute.length` 检测。已有代码不受影响。

## 自动生成工具

`sandbox.tools()` 返回 `ToolDefinition` 对象：

**VirtualSandbox**: `readFile`, `writeFile`, `readdir`

**ContainerSandbox**（额外包含）: `exec`, `execShell`, `httpGet`

展开到 agent 的工具中：

```ts
const agent = halo.agent({
  tools: { ...sandbox.tools(), ...myCustomTools },
  sandbox,
});
```

## 安全

- **路径隔离**: 所有路径在 `baseDir` 内解析。`../` 穿越和指向外部的符号链接被阻止。
- **默认无 shell**: `exec()` 使用结构化参数 — 无注入风险。
- **`execShell()` 要求 `allowShell: true`** — 显式安全门。
- **每条命令有超时**: 默认 30s。
- **`dispose()` 杀死所有后台进程**: 先 SIGTERM，后 SIGKILL。
