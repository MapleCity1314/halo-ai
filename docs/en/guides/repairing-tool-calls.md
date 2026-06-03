# Repairing Tool Calls

LLMs sometimes produce malformed tool calls — truncated JSON, missing brackets, or hallucinated function names. `RepairStrategy` fixes these before execution.

## Built-in: BasicRepair

```ts
import { BasicRepair } from "@halo-ai/strategies";

const agent = halo.agent({
  system: "...",
  tools: { ... },
  repair: new BasicRepair(),
});
```

`BasicRepair` handles the most common issue: truncated JSON arguments. When the model's output is cut off mid-JSON:

```
Input:  '{"city":"Par'
Output: '{"city":"Par"}'   ← fixed: balanced braces and quotes
```

## RepairResult

```ts
interface RepairResult {
  toolCalls: ToolCall[];  // Repaired tool calls
  fixed: number;          // How many were fixed
  scavenged: number;      // How many were recovered from raw content
  suppressed: number;     // How many invalid calls were suppressed
  notes: string[];        // Human-readable notes
}
```

## Custom Repair Strategy

```ts
import type { RepairStrategy, RepairResult, ToolCall } from "@halo-ai/core";

class StrictRepair implements RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult {
    const repaired: ToolCall[] = [];
    let suppressed = 0;

    for (const call of toolCalls) {
      // Validate tool exists
      if (!KNOWN_TOOLS.has(call.function.name)) {
        suppressed++;
        continue;
      }

      // Validate JSON arguments
      try {
        JSON.parse(call.function.arguments);
        repaired.push(call);
      } catch {
        // Try to fix truncated JSON
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
      notes: suppressed > 0 ? [`Suppressed ${suppressed} invalid tool calls`] : [],
    };
  }
}
```

## Monitoring Repairs

```ts
const agent = halo.agent({
  system: "...",
  repair: new BasicRepair(),
  on: (event, payload) => {
    if (event === "repair:applied") {
      console.log(`Fixed: ${payload.fixed}, Suppressed: ${payload.suppressed}`);
      console.log(payload.notes);
    }
  },
});
```
