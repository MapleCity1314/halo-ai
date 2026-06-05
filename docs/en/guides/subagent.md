# SubAgent Pattern

Delegate work to specialized sub-agents using standard Halo tools. No new packages needed — sub-agents are `ToolDefinition` objects whose `execute` creates a short-lived `HaloAgent`.

## Core Pattern

```ts
const codeReviewer: ToolDefinition<{ code: string }> = {
  description: "Review code for bugs and security issues",
  parameters: {
    type: "object",
    properties: { code: { type: "string" } },
    required: ["code"],
  },
  execute: async ({ code }) => {
    // Create a short-lived agent — fresh context per call
    const agent = halo.agent({
      messages: [
        { role: "system", content: "You are a senior code reviewer. Find bugs, security issues, and suggest improvements." },
      ],
      model: { temperature: 0.1 },
    });
    const result = await agent.generateText(code);
    return result.content;
  },
};
```

Feed it to a parent agent like any other tool:

```ts
const mainAgent = halo.agent({
  messages: [{ role: "system", content: "You are a tech lead. Delegate code review to the reviewer tool." }],
  tools: { code_reviewer: codeReviewer },
});
```

## When to Use SubAgents

**Use a sub-agent when:**
- Tasks can run in **parallel** (three analyses simultaneously)
- Sub-tasks need **different tool sets** (searcher needs Puppeteer, analyst doesn't)
- Intermediate output is **too large** for the parent's MessageLog
- Sub-tasks need **different model parameters** (search: temp 0.1, creative: temp 0.9)

**Don't use a sub-agent when:**
- The task fits in one turn without context pressure
- The sub-task needs full conversation context from the parent
- It's a trivial lookup that takes one call

## Patterns

### Parallel Dispatch

When the model returns multiple independent tool calls, execute them concurrently:

```ts
// In onToolCall:
const results = await Promise.all(
  toolCalls.map(call => {
    const executor = toolExecutors.get(call.function.name);
    return executor?.(JSON.parse(call.function.arguments));
  })
);
```

### Chain (Pipeline)

Each step's output feeds the next:

```ts
const search = await searcherAgent.generateText(topic);
const analysis = await analystAgent.generateText(search.content);
const report = await writerAgent.generateText(analysis.content);
```

### Router

A dispatcher chooses which specialist to call:

```ts
const router: ToolDefinition<{ task: string }> = {
  description: "Route a task to the right specialist",
  parameters: { ... },
  execute: async ({ task }) => {
    const decision = await routerAgent.generateText(
      `Choose: frontend, backend, or devops for: ${task}`
    );
    const agent = { frontend: feAgent, backend: beAgent, devops: opsAgent }[decision.content.trim()];
    return (await agent.generateText(task)).content;
  },
};
```

## Output Format

Sub-agent results become tool-result messages in the parent's MessageLog. Structure them for the parent to consume efficiently:

```ts
execute: async (args) => {
  const result = await subAgent.generateText(JSON.stringify(args));
  return JSON.stringify({
    content: result.content,
    sources: extractSources(result.content),
    confidence: "high",
  });
}
```

## Context Budget

Every sub-agent delegation costs one tool-result message in the parent's MessageLog. A verbose sub-agent that returns 3000 tokens of prose costs 3000 tokens of parent context. For mechanical tasks, instruct the sub-agent to return compressed output.

## Module-Level Reuse (Cache Hit Optimization)

For sub-agents with fixed configuration, reuse a single instance:

```ts
const _reviewer = halo.agent({
  messages: [{ role: "system", content: "You are a code reviewer." }],
  model: { temperature: 0.1 },
});

const codeReviewer: ToolDefinition<{ code: string }> = {
  description: "Review code",
  parameters: { ... },
  execute: async ({ code }) => {
    const result = await _reviewer.generateText(code);
    _reviewer.clearLog(); // Reset conversation, keep prefix cache
    return result.content;
  },
};
```

Tradeoff: reusing an agent shares its `StablePrefix` across calls (cache hits after the first). But requires `clearLog()` between calls to prevent context leakage.
