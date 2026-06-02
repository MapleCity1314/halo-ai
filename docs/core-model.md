# Halo 核心模型

Halo 是一个通用的 Cache-First AI SDK。本文档定义其类型、接口和类的契约。不含实现。

---

## 一、基础类型

### 协议层

发给 API 的消息格式。和 OpenAI Chat Completions 协议一一对应。

```typescript
type Role = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: Role;
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;  // JSON string
  };
}

interface ToolSpec {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}
```

### Usage

缓存字段在可选子对象中。不支持前缀缓存的 adapter 不出现 `caching`，避免静默零值。

```typescript
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

### Turn 结果

```typescript
interface TurnResult {
  content: string;
  toolCalls: ToolCall[];
  usage: Usage;
}
```

### 流式 Chunk

```typescript
type TurnChunk =
  | { type: "text-delta"; delta: string }
  | { type: "tool-call-delta"; index: number; name?: string; argumentsDelta?: string }
  | { type: "tool-call-ready"; index: number; call: ToolCall }
  | { type: "done"; usage: Usage };
```

### 展示层

`HaloUIMessage` 和 `ChatMessage` 是两层。前者在 `/react`，后者在 `/core`。做后端的用户永远不需要 import `HaloUIMessage`。

```typescript
interface HaloUIMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  status: "streaming" | "done" | "error";
  createdAt: number;
  usage?: Usage;
  toolInvocations?: Array<{
    toolCallId: string;
    toolName: string;
    args: Record<string, unknown>;
    result?: string;
    status: "pending" | "running" | "done" | "error";
  }>;
}
```

---

## 二、前缀管理

```typescript
class StablePrefix {
  constructor(opts: {
    system: string;
    tools: ToolSpec[];
    fewShots?: ChatMessage[];
    hashFn?: (input: string) => string;
  });

  toMessages(): ChatMessage[];
  tools(): ToolSpec[];

  readonly fingerprint: string;
  readonly diagnostics: {
    systemHash: string;
    toolSpecsHash: string;
    fewShotsHash: string;
    toolCount: number;
    toolNames: string[];
  };

  addTool(spec: ToolSpec): boolean;
  removeTool(name: string): boolean;
  addFewShot(msg: ChatMessage): void;
  removeFewShot(index: number): boolean;
}
```

**设计意图**：

- 用户不直接构造。`HaloSession` 内部管理。
- 任何修改方法触发指纹变化，导致下一次 API 调用缓存未命中。
- `toMessages()` 和 `tools()` 返回不可变引用。不能通过修改返回值绕过指纹。
- `hashFn` 可替换。默认 `node:crypto`，浏览器换 `SubtleCrypto`。

---

## 三、消息日志

```typescript
class MessageLog {
  constructor(opts?: { storageLimit?: number });

  append(msg: ChatMessage): void;
  toFullHistory(): ChatMessage[];
  recent(n: number): ChatMessage[];

  readonly length: number;
  readonly version: number;
}
```

- `storageLimit` 是纯内存保护上限。超过后丢弃最旧消息。和发送截断无关。
- 发送截断的唯一入口是 `ContextStrategy.prepare()`。
- 纯内存，不持久化。持久化由外部 `JSON.stringify(log.toFullHistory())`。

---

## 四、模型适配器

```typescript
interface ModelCapabilities {
  prefixCaching: boolean;
  toolUse: boolean;
  streaming: boolean;
  cacheTokenFields?: {
    hitField: string;
    missField: string;
  };
}

interface ModelAdapter {
  chat(messages: ChatMessage[], tools?: ToolSpec[]): Promise<{
    content: string;
    toolCalls: ToolCall[];
    usage: Usage;
  }>;

  stream(messages: ChatMessage[], tools?: ToolSpec[]): AsyncGenerator<TurnChunk>;

  readonly modelId: string;
  readonly contextWindow: number;
  readonly capabilities: ModelCapabilities;
}
```

**`capabilities` 是多模型地基。** OpenAI adapter 的 `prefixCaching` 是 `true`，local LLM 是 `false`。上层据此决定行为。

`DeepSeekAdapter` 是 v0.1 的唯一内置实现：

```typescript
class DeepSeekAdapter implements ModelAdapter {
  constructor(opts: {
    apiKey: string;
    model?: string;
    baseUrl?: string;
  });
  readonly modelId: string;
  readonly contextWindow: number;   // 128000
  readonly capabilities: ModelCapabilities;
}
```

---

## 五、Session 诊断

```typescript
interface CacheMissReason {
  type: "cold-start" | "system-changed" | "tools-changed"
      | "fewshots-changed" | "unknown";
  detail: string;
  added?: string[];
  removed?: string[];
}

interface PricingSnapshot {
  recordedAt: number;
  inputPricePer1k: number;
  cachedInputPricePer1k: number;
}

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

`estimatedSavingsUsd` 在 `prefixCaching === false` 时为 `null`。0 暗示"没省到"，null 暗示"不支持"。

---

## 六、策略接口

三个可选策略。不传等于 `"none"`——最简单的行为。

### ContextStrategy

```typescript
interface ContextStrategy {
  prepare(messages: ChatMessage[], ctxMax: number): {
    messages: ChatMessage[];
    modified: boolean;
    summary?: string;
    droppedCount: number;
  };
}
```

发送前调用。唯一的截断/压缩入口。`MessageLog` 不管这个。

### RepairStrategy

```typescript
interface RepairResult {
  toolCalls: ToolCall[];
  fixed: number;
  scavenged: number;
  suppressed: number;
  notes: string[];
}

interface RepairStrategy {
  repair(toolCalls: ToolCall[], rawContent: string): RepairResult;
}
```

模型输出后、工具执行前调用。

### ConfirmationStrategy

```typescript
interface ConfirmationStrategy {
  approve(name: string, args: Record<string, unknown>): Promise<boolean>;
}
```

---

## 七、HaloSession

SDK 核心入口。两套方法对应两种使用深度。

```typescript
class HaloSession {
  constructor(opts: {
    adapter: ModelAdapter;
    system: string;
    tools?: ToolSpec[];
    fewShots?: ChatMessage[];
    context?: ContextStrategy;
    repair?: RepairStrategy;
    confirmation?: ConfirmationStrategy;
    on?: (event: SessionEvent, payload: unknown) => void;
  });

  // 一等公民：自动工具循环。80% 用户的入口。
  run(input: string, opts?: {
    maxSteps?: number;
    onToolCall?: (call: ToolCall) => Promise<ToolResult>;
    onStep?: (s: {
      step: number;
      content: string;
      toolCalls: ToolCall[];
    }) => void;
  }): Promise<TurnResult>;

  // 手动控制：human-in-the-loop。
  send(input: string): Promise<TurnResult>;
  stream(input: string): AsyncGenerator<TurnChunk>;
  submitToolResult(result: ToolResult): Promise<TurnResult>;

  // 前缀
  addTool(spec: ToolSpec): void;
  removeTool(name: string): void;
  addFewShot(msg: ChatMessage): void;
  removeFewShot(index: number): boolean;

  // 缓存保障
  keepAlive(intervalMs?: number): { stop: () => void };

  // 生命周期
  clearLog(): void;
  setSystem(system: string): void;

  // 诊断
  readonly stats: SessionStats;
}

interface ToolResult {
  toolCallId: string;
  output: string;
  isError?: boolean;
}

type SessionEvent = "cache:miss" | "context:truncated" | "repair:applied";
```

- `run()` 内部自动循环：模型调用 → 工具执行 → 反馈结果 → 再次调用 → 直到没有 tool_calls 或达到 maxSteps。
- `keepAlive()` 解决重任务场景的核心矛盾：任务执行时间超过缓存 TTL。定期发送 ping 维持服务端 KV Cache。
- `clearLog()` 不改变前缀。`/new` 语义保留缓存热度。

---

## 八、工厂入口

```typescript
class Halo {
  constructor(opts: { adapter: ModelAdapter });

  session(opts: {
    system: string;
    tools?: ToolSpec[];
    fewShots?: ChatMessage[];
    context?: "truncate" | "summarize" | ContextStrategy;
    repair?: "basic" | "full" | RepairStrategy;
    confirmation?: "confirm" | ConfirmationStrategy;
    contextOptions?: { maxTokens?: number };
    repairOptions?: { stormThreshold?: number; stormWindow?: number };
    on?: (event: SessionEvent, payload: unknown) => void;
  }): HaloSession;
}
```

策略接受字符串简写或对象实例。字符串简写通过 `contextOptions` / `repairOptions` 传递参数。

---

## 九、流处理层（`/stream` subpath）

```typescript
function toDataStream(
  source: AsyncGenerator<TurnChunk>,
  opts?: { headers?: Record<string, string> },
): Response;

function createHaloStream(
  fn: (ctrl: {
    writeText: (delta: string) => void;
    writeToolCall: (call: ToolCall) => void;
    close: (usage?: Usage) => void;
    error: (err: Error) => void;
  }) => Promise<void>,
): ReadableStream;
```

- `toDataStream` 格式兼容 Vercel AI SDK 的 `0:` / `d:` 协议。
- `createHaloStream` 不走 `HaloSession`，用于自定义流场景。

---

## 十、React 层（`/react` subpath）

```typescript
function useHaloChat(opts: {
  halo: Halo;
  session: HaloSession;
}): {
  messages: HaloUIMessage[];
  send: (input: string) => Promise<void>;
  isLoading: boolean;
};
```

流式过程中自动管理 `status`：`streaming` → 逐字填充 → `done` → 填入 `usage`。UI 用 `msg.status` 判断光标，不依赖外部 `isLoading`。

---

## 十一、模块结构

```
halo-ai
  /core       — HaloSession, StablePrefix, MessageLog, 基础类型
  /adapters   — DeepSeekAdapter（唯一需要网络的模块）
  /stream     — toDataStream, createHaloStream
  /react      — useHaloChat, HaloUIMessage
  /strategies — TruncateStrategy, SummarizeStrategy, BasicRepair, FullRepair, ConfirmStrategy
```

**零外部依赖。** `/adapters` 依赖 Node 18+ 内置 `fetch` 和 `crypto`。`/react` 依赖 `react`。其余纯 TypeScript 逻辑。

---

## 十二、依赖图

```
Halo（工厂）
  └─► HaloSession
        ├─► StablePrefix          （前缀稳定）
        ├─► MessageLog            （消息历史）
        ├─► ModelAdapter          （调用模型）
        ├─► ContextStrategy?      （可选：截断/摘要）
        ├─► RepairStrategy?       （可选：JSON 修复/循环抑制）
        └─► ConfirmationStrategy? （可选：工具确认）

DeepSeekAdapter implements ModelAdapter
  └─► fetch → DeepSeek API /chat/completions

/stream（独立）
  ├─ toDataStream()
  └─ createHaloStream()

/react（依赖 Halo + HaloSession）
  └─ useHaloChat() → HaloUIMessage[]

/strategies（独立，仅依赖类型接口）
  ├─ TruncateStrategy    implements ContextStrategy
  ├─ SummarizeStrategy   implements ContextStrategy
  ├─ BasicRepair         implements RepairStrategy
  ├─ FullRepair          implements RepairStrategy
  └─ ConfirmStrategy     implements ConfirmationStrategy
```

---

## 十三、定位

**通用 Agent SDK，兼顾重任务。** `run()` 是轻量默认入口，`send()` + `submitToolResult()` 是 heavy / human-in-the-loop 的手动入口，`keepAlive()` 是重任务缓存保障的基础设施。
