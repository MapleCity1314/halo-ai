# 沙箱

在安全的隔离环境中为 Halo Agent 提供文件系统访问和命令执行能力。

## 快速开始

```ts
import { ContainerSandbox } from "@halo-ai/sandbox";

const sandbox = new ContainerSandbox({
  baseDir: "/tmp/agent-workspace",
});

const agent = halo.agent({
  messages: [{ role: "system", content: "你有一个工作区在 /tmp/agent-workspace。" }],
  tools: sandbox.tools(),
  sandbox,
});

await agent.generateText("创建一个 hello.sh 脚本并运行它");
await sandbox.dispose();
```

## 选择沙箱

**使用 VirtualSandbox：**
- 在浏览器或 Edge 运行时（无 `child_process`）
- 测试 — 临时存储，无需清理
- Agent 只需要文件读写，不需要执行命令

**使用 ContainerSandbox：**
- Agent 需要执行真实命令（`exec`、`execShell`）
- 文件需要跨会话持久化
- 在 Node.js 服务器上运行

```ts
// Virtual — 纯内存 Map，构建时间 <1ms
import { VirtualSandbox } from "@halo-ai/sandbox";
const sb = new VirtualSandbox();

// Container — 真实 fs + child_process，构建时间 ~3ms
import { ContainerSandbox } from "@halo-ai/sandbox";
const sb = new ContainerSandbox({ baseDir: "/tmp/work" });
```

## 文件操作

```ts
await sandbox.writeFile("config.json", JSON.stringify({ port: 3000 }));
const data = await sandbox.readFile("config.json"); // string (UTF-8)

const entries = await sandbox.readdir("."); // { name, isDirectory }[]
const hasFile = await sandbox.exists("config.json"); // boolean
```

`writeFile` 自动创建父目录。所有路径相对于沙箱根目录。

## 命令执行

### 结构化执行（无 shell）

```ts
const result = await sandbox.exec("echo", ["hello", "world"], {
  cwd: "subdir",
  env: { DEBUG: "1" },
  timeout: 10_000,
});
console.log(result.stdout);    // "hello world\n"
console.log(result.exitCode);  // 0
```

### Shell 模式（需显式同意）

```ts
const result = await sandbox.execShell("ls -la | grep '.ts'", {
  allowShell: true, // 必须为 true
});
```

### 后台进程

```ts
const server = await sandbox.exec("node", ["server.js"], {
  background: true,
  exposePort: 0,          // 自动分配端口
  bindHost: "127.0.0.1",
  portTTL: 300_000,       // 5 分钟空闲 → 自动 kill
});

console.log(server.url);  // "http://127.0.0.1:45678"

for await (const line of server.stdout) {
  if (line.includes("ready")) break;
}
```

## 工具集成

当 `sandbox` 传入 `halo.agent()` 时，双参数 `execute` 工具自动接收沙箱：

```ts
const agent = halo.agent({
  sandbox,
  tools: {
    readConfig: tool({
      description: "从工作区读取配置文件",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
      execute: async ({ path }, ctx) => {
        // ctx.sandbox 自动注入
        return await ctx.sandbox.readFile(path);
      },
    }),
  },
});
```

单参数 `execute` 函数不受影响 — 向后兼容。

## 安全模型

ContainerSandbox 强制执行多层保护：

1. **路径隔离**: 所有路径在 `baseDir` 内解析。`../etc/passwd` 被阻止。外部符号链接通过 `realpath` 检查阻断。
2. **默认无 shell**: `exec()` 使用结构化参数 — 无注入风险。
3. **Shell 需显式同意**: `execShell()` 仅在 `allowShell: true` 时可用。
4. **每条命令有超时**: 防止失控进程。
5. **资源限制**: `cpuLimit`、`memoryLimit`、`maxDiskUsage`、`maxBackgroundProcesses`。

**不要禁用这些检查。** 它们是安全边界。

## 缓存模型

沙箱对象及其内容不进入 `StablePrefix`。只有 `sandbox.tools()` 的 ToolSpec 对象进入前缀（因为是传给 `halo.agent({ tools })` 的）。沙箱实例本身对缓存透明。

## 生命周期

```ts
// 手动清理:
await sandbox.dispose(); // 杀死所有进程。不删除文件。

// 自动（TS 5.2+）:
{
  await using sandbox = new ContainerSandbox({ baseDir: "/tmp/work" });
  // ... 使用沙箱 ...
} // dispose() 自动调用
```

`dispose()` 向所有后台进程发送 SIGKILL。磁盘上的文件会保留 — 如需删除，请单独处理。
