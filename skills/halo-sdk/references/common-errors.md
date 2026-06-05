# Common Errors

## `system` and `messages` cannot be used together

```ts
// ❌ Wrong
halo.agent({ system: "You are helpful.", messages: [...] });
// → Error: Cannot specify both `messages` and `system`.

// ✅ Correct
halo.agent({
  messages: [{ role: "system", content: "You are helpful." }],
});
```

## `loadSkill` is a reserved tool name

```ts
// ❌ Wrong
halo.agent({
  skills: [...],
  tools: { loadSkill: { ... } },  // Conflict!
});
// → Error: Reserved tool name "loadSkill" conflicts with agent skills.

// ✅ Correct
// Either remove loadSkill from your tools, or pass an empty skills array.
```

## Tools with `execute` need `Record<string, ToolDefinition>`, not `ToolSpec[]`

```ts
// ❌ Wrong — ToolSpec has no execute, tools won't auto-run
halo.agent({
  tools: [{ type: "function", function: { name: "x", ... } }],
});
// agent.generateText("...") will stop on tool calls without an onToolCall handler.

// ✅ Correct — use Record format for auto-execute
halo.agent({
  tools: {
    weather: { description: "...", parameters: {...}, execute: async (args) => "22°C" },
  },
});
```

## `generateText` stops when there's no way to execute tools

If the model returns tool calls but no `execute` function exists and no `onToolCall` is provided, the loop stops immediately and returns the pending tool calls. This is by design — it prevents infinite loops. Either:
- Provide `execute` in the `ToolDefinition`
- Pass `onToolCall` to `generateText(opts)`
- Use `send()` + `submitToolResult()` for manual control

## `onToolCall` return type

```ts
// ❌ Wrong
onToolCall: async (call) => "just a string"

// ✅ Correct
onToolCall: async (call) => ({
  toolCallId: call.id,
  output: "tool execution result",
  isError: false,  // optional, default false
})
```

## `streamText` input is polymorphic

```ts
// ✅ String — treated as current user input
agent.streamText("Hello");

// ✅ ChatMessage[] — hydrates prior history, last message is current input
agent.streamText([
  { role: "user", content: "Previous question" },
  { role: "assistant", content: "Previous answer" },
  { role: "user", content: "New question" },  // ← this is the current turn
]);
```

## `generateObject` suppresses tools

When calling `generateObject`, tools are not sent to the model (to avoid conflicts with `responseFormat`). If you need both structured output and tools, use two separate calls.

## Cache miss on first mutation is expected

After `addTool()`, `removeTool()`, `addFewShot()`, `removeFewShot()`, or `setSystem()`, the first subsequent request will experience a cache miss. This is by design — the new prefix needs to be cached once. The second request with the same tools will hit again.
