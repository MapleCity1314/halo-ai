# 修复工具调用

LLM 有时会产生格式错误的工具调用——JSON 被截断、括号不匹配或幻觉出的函数名。`RepairStrategy` 在执行前修复这些错误。

## 内置: BasicRepair

```ts
import { BasicRepair } from "@halo-ai/strategies";

const agent = halo.agent({
  system: "...",
  tools: { ... },
  repair: new BasicRepair(),
});
```

`BasicRepair` 处理最常见的问题：JSON 参数被截断。当模型输出在 JSON 中间被切断时：

```
输入:   '{"city":"Par'
输出:   '{"city":"Par"}'   ← 已修复：补全了括号和引号
```

## RepairResult

```ts
interface RepairResult {
  toolCalls: ToolCall[];  // 修复后的工具调用
  fixed: number;          // 修复的数量
  scavenged: number;      // 从原始内容中恢复的数量
  suppressed: number;     // 被抑制的无效调用数量
  notes: string[];        // 人类可读的说明
}
```

## 自定义修复策略

```ts
import type { RepairStrategy, RepairResult, ToolCall } from "@halo-ai/core";

class StrictRepair implements RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult {
    const repaired: ToolCall[] = [];
    let suppressed = 0;

    for (const call of toolCalls) {
      // 验证工具是否存在
      if (!KNOWN_TOOLS.has(call.function.name)) {
        suppressed++;
        continue;
      }

      // 验证 JSON 参数
      try {
        JSON.parse(call.function.arguments);
        repaired.push(call);
      } catch {
        // 尝试修复截断的 JSON
        const fixed = tryFixJson(call.function.arguments);
        if (fixed) {
          repaired.push({ ...call, function: { ...call.function, arguments: fixed } });
        } else {
          suppressed++;
        }
      }
    }

    return {
      toolCalls: repaired,
      fixed: 0,
      scavenged: 0,
      suppressed,
      notes: suppressed > 0 ? [`已抑制 ${suppressed} 个无效工具调用`] : [],
    };
  }
}
```

## 监控修复事件

```ts
const agent = halo.agent({
  system: "...",
  repair: new BasicRepair(),
  on: (event, payload) => {
    if (event === "repair:applied") {
      console.log(`已修复: ${payload.fixed}, 已抑制: ${payload.suppressed}`);
      console.log(payload.notes);
    }
  },
});
```
