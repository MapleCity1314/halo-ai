# 稳定前缀与消息日志

使 Cache-First 成为可能的两个核心数据结构。

## StablePrefix

```ts
import { StablePrefix } from "@halo-ai/core";

const prefix = new StablePrefix({
  system: "你是一个有用的助手。",
  tools: [{ type: "function", function: { name: "get_weather", ... } }],
  fewShots: [
    { role: "user", content: "2+2=?" },
    { role: "assistant", content: "4" },
  ],
});
```

### 属性

| 属性 | 类型 | 描述 |
|---|---|---|
| `fingerprint` | `string` | 整个前缀的 SHA-256[:16] 指纹。任何变化都会改变。 |
| `diagnostics` | `object` | `{ systemHash, toolSpecsHash, fewShotsHash, toolCount, toolNames }` |

### 方法

| 方法 | 返回值 | 描述 |
|---|---|---|
| `toMessages()` | `ChatMessage[]` | 返回 `[system, ...fewShots]` 不可变副本 |
| `tools()` | `ToolSpec[]` | 返回工具规格的冻结副本 |
| `addTool(spec)` | `boolean` | 添加工具。若名称已存在返回 `false`。使指纹失效 |
| `removeTool(name)` | `boolean` | 移除工具。使指纹失效 |

## MessageLog

```ts
const log = new MessageLog({ storageLimit: 10_000 });
log.append({ role: "user", content: "你好" });
log.append({ role: "assistant", content: "你好！" });
```

### 方法

| 方法 | 描述 |
|---|---|
| `append(msg)` | 添加消息。超过 `storageLimit` 则丢弃最旧的 |
| `hydrate(messages)` | 替换所有条目。用于从外部历史恢复状态 |
| `toFullHistory()` | 所有消息的浅拷贝 |
| `recent(n)` | 最近 N 条消息的浅拷贝 |
