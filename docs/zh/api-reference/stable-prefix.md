# `StablePrefix`

管理不可变前缀（system prompt + tools + few-shots），使用 SHA-256 指纹。

## 导入

```ts
import { StablePrefix } from "@halo-ai/core";
```

## 构造函数

```ts
new StablePrefix(opts: {
  system: string;
  tools: ToolSpec[];
  fewShots?: ChatMessage[];
  hashFn?: (input: string) => string;
})
```

## 属性

| 属性 | 类型 | 描述 |
|---|---|---|
| `fingerprint` | `string` | SHA-256[:16] 十六进制。当 system、tools 或 few-shots 发生任何变更时更新 |
| `diagnostics` | `object` | `{ systemHash, toolSpecsHash, fewShotsHash, toolCount, toolNames }` |

## 方法

| 方法 | 返回值 | 描述 |
|---|---|---|
| `toMessages()` | `ChatMessage[]` | `[system, ...fewShots]` — 不可变副本 |
| `tools()` | `ToolSpec[]` | 工具规范的冻结浅拷贝 |
| `addTool(spec)` | `boolean` | 添加工具。名称存在时返回 `false`。使指纹失效 |
| `removeTool(name)` | `boolean` | 移除工具。使指纹失效 |
| `addFewShot(msg)` | `void` | 添加 few-shot 示例。使指纹失效 |
| `removeFewShot(index)` | `boolean` | 按索引移除 few-shot 示例。使指纹失效 |
