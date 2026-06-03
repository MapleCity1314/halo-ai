# Types

Core type definitions used throughout the SDK.

## ChatMessage

```ts
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}
```

## ToolCall

```ts
interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON string
  };
}
```

## ToolSpec

```ts
interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}
```

## ToolDefinition

```ts
interface ToolDefinition<TArgs = Record<string, unknown>> {
  description: string;
  parameters: Record<string, unknown>;
  execute?: (args: TArgs) => string | Promise<string>;
}
```

## Usage

```ts
interface Usage {
  promptTokens: number;
  completionTokens: number;
  caching?: {
    hitTokens: number;
    missTokens: number;
    hitRate: number;
  };
}
```

## TurnResult

```ts
interface TurnResult {
  content: string;
  toolCalls: ToolCall[];
  usage: Usage;
}
```

## TurnChunk

```ts
type TurnChunk =
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-delta"; index: number; name?: string; argumentsDelta?: string }
  | { type: "tool-call-ready"; index: number; call: ToolCall }
  | { type: "done"; usage: Usage };
```

## ToolResult

```ts
interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}
```

## SessionStats

```ts
interface SessionStats {
  turns: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  caching?: {
    totalCacheHitTokens: number;
    totalCacheMissTokens: number;
    cacheHitRate: number;
    estimatedSavingsUsd: number | null;
  };
  pricingSnapshot: PricingSnapshot;
  recentDiagnostics: CacheMissReason[];
}
```

## AgentEvent

```ts
type AgentEvent = "cache:miss" | "context:truncated" | "repair:applied";
```
