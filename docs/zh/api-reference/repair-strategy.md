# `RepairStrategy` + `BasicRepair`

修复格式错误的工具调用的接口与内置实现。

## 接口

```ts
interface RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult;
}

interface RepairResult {
  toolCalls: ToolCall[];
  fixed: number;
  scavenged: number;
  suppressed: number;
  notes: string[];
}
```

## BasicRepair

```ts
import { BasicRepair } from "@halo-ai/strategies";

new BasicRepair()
```

通过平衡花括号、方括号和引号来修复截断的 JSON 参数。

## 使用

```ts
const agent = halo.agent({
  system: "You are a helpful assistant.",
  repair: new BasicRepair(),
});
```
