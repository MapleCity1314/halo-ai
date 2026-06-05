---
name: halo-subagent
description: Use when a task is too large for a single turn, requires a different toolset or model settings, or has independent sub-tasks that can run in parallel. Triggers on: large research task, multi-angle analysis, parallel investigation, context budget pressure, or when you need a specialist for a sub-problem you cannot handle with your current tools.
---

# Delegating to Sub-Agents

You have access to sub-agents through tool calls. Each sub-agent tool spawns a fresh agent instance with its own system prompt, tools, and context window. Use them to offload work that would otherwise exhaust your context or require capabilities you don't have.

**Core principle:** Delegate when the sub-task is self-contained, expensive in tokens, or needs different tools. Do it yourself when the full context matters.

## When to Delegate

### Delegate when:

- **Parallel work.** Three independent analyses can run concurrently. Dispatch all three, then synthesize the results.
- **Different tools needed.** A web search sub-agent needs Puppeteer. An analysis sub-agent doesn't. Keep tool sets focused.
- **Context budget pressure.** A deep investigation that reads 10+ files will flood your MessageLog. Offload to a sub-agent and get back only the findings.
- **Different model parameters.** Search needs temperature 0.1. Creative writing needs 0.9. Different sub-agents get different settings.
- **Self-contained sub-problem.** "Fact-check these 5 claims" is a complete task with clear input and expected output.

### Do NOT delegate when:

- **Small task.** If you can finish it in one turn without exhausting context, just do it.
- **Full context matters.** If the sub-task needs to cross-reference many prior messages in this conversation, a sub-agent won't have that history.
- **One-off lookup.** "What does this variable name mean?" — search your own context first.
- **Sequentially dependent chain where each step is trivial.** Three 30-second steps chained together cost less than dispatching and waiting.

### Decision flowchart:

```
Task needs to be done?
  ├─ Fits in one turn without context pressure? → Do it yourself.
  ├─ Independent from other tasks? → Dispatch in parallel with siblings.
  ├─ Needs different tools or model settings? → Delegate.
  ├─ Will read 5+ files or do 3+ search rounds? → Delegate to save context.
  └─ Small and needs full conversation context? → Do it yourself.
```

## How to Delegate Effectively

### 1. Write a precise task description

Pass all necessary context in the arguments. The sub-agent has zero prior knowledge of this conversation. Include:

- What exactly to do
- What format to return
- What NOT to do (constraints)
- How to handle edge cases

```json
{
  "query": "impact of quantum computing on RSA-2048 encryption",
  "maxSources": 5,
  "returnFormat": "## Sources\n- [Title](URL) — relevance\n## Key Facts\n- Fact (source: URL)"
}
```

### 2. Demand a specific output format

The sub-agent's result becomes one tool-result message in your MessageLog. Structure it so you can consume it efficiently:

**For information retrieval:** Ask for list format with source annotations.
**For analysis:** Ask for findings + confidence + evidence.
**For verification:** Ask for verdict per claim + supporting source.

**Never accept raw prose as the default.** If the tool description doesn't specify a format, add a format instruction in your arguments.

### 3. Delegate independent tasks in parallel

When you have multiple independent tool calls, dispatch them simultaneously. The platform executes them concurrently.

**Example — researching a topic:**
- Call `search_and_collect` for web sources
- Call `analyze_content` for a document you already have
These are independent — dispatch both at once, not sequentially.

**Red flag:** If task B depends on the output of task A, you MUST wait for A before dispatching B. Do not guess dependencies.

### 4. Set a scope boundary

Every delegation should have a clear stop condition:

- **"Return after finding 5 sources."** — prevents infinite search loops.
- **"Analyze only the accuracy angle, not style or bias."** — prevents scope creep.
- **"If you cannot verify a claim, mark it unverifiable and move on."** — prevents dead ends.

Without boundaries, sub-agents can burn tokens on diminishing returns.

## Interpreting Sub-Agent Results

### When results are good:

- Synthesize, don't echo. Don't repeat the sub-agent's full output verbatim in your response — extract the key insights.
- Cite the sub-agent's findings, not the sub-agent itself ("According to source analysis..." not "The search agent found...").
- Cross-reference. If two sub-agents returned conflicting findings, flag the disagreement.

### When results are incomplete or failed:

- **"I couldn't find..."** — Narrow the scope, try different search terms, or accept the gap and note it.
- **Empty or very short result.** — The sub-agent may have misunderstood. Re-dispatch with clearer instructions.
- **Error in output.** — Check if the input was malformed. Fix and retry once. If it fails again, handle the task yourself or report the limitation.

### Context budget check:

After 3+ delegations in one turn, check: is your MessageLog approaching the context limit? If yes, summarize intermediate results and discard the raw tool outputs (they are marked `discardable` for a reason).

## Parallel Safety Rules

- **Never** dispatch sub-agents that write to the same file or resource. They will race.
- **Prefer** dispatching readers in parallel, writers sequentially.
- **If unsure** whether tasks are independent, run them sequentially. A slow correct result beats a fast corrupted one.

## Model Selection Hint

When delegating, consider the complexity:

- **Mechanical tasks** (find and list, format conversion, simple lookup): request the fast model.
- **Analysis tasks** (evaluate claims, compare approaches, find patterns): request the standard model.
- **Judgment tasks** (architecture decisions, security review, trade-off analysis): request the most capable model.

If you don't control model selection directly, hint in the sub-agent's system prompt: "Be thorough" for complex tasks, "Be concise and fast" for mechanical ones.
