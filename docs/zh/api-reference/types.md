# 类型

核心类型定义。

## ChatMessage

```ts
interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}
```

## ToolCall

```ts
interface ToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string; };
}
```

## Usage

```ts
interface Usage {
  promptTokens: number;
  completionTokens: number;
  caching?: { hitTokens: number; missTokens: number; hitRate: number; };
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
}
```
