# Agent Skills

Agent Skills follow the [agentskills.io](https://agentskills.io) progressive disclosure pattern: metadata in the system prompt (cached), body loaded on demand (uncached).

## How It Works

```
1. discoverSkills() → reads SKILL.md frontmatter → name + description
2. halodem({ skills })  → name + description enters StablePrefix (cached)
3. Agent calls loadSkill("skill-name") at runtime
4. Body loaded from disk → enters MessageLog (uncached, discardable)
5. ContextStrategy can drop skill bodies first when truncating
```

This keeps the prefix small (just one line per skill) while giving the agent access to detailed instructions when needed.

## Discovering Skills

```ts
import { discoverSkills } from "@halo-ai/core";

const skills = await discoverSkills({
  directories: [".halo/skills", "~/.halo/skills"],
});
```

Scanning rules:
- Each subdirectory with a `SKILL.md` is a skill
- `name` and `description` parsed from YAML frontmatter
- First skill with a given name wins (project overrides global)

## Writing a Skill

Create `skills/my-skill/SKILL.md`:

```markdown
---
name: my-skill
description: Use when the user asks about X or you need to do Y.
---

# My Skill

Detailed instructions, patterns, and examples go here.
This body is loaded when the agent calls `loadSkill("my-skill")`.
```

The description is critical — it's the only thing the agent sees before deciding to load the body. Write it as a trigger condition ("Use when..."), not a summary of the body.

## Using Skills with an Agent

```ts
const agent = halo.agent({
  messages: [{ role: "system", content: "You are a helpful assistant." }],
  skills,
  tools: { ... },
});

// The system prompt now includes:
// ## Available Skills
// - my-skill: Use when the user asks about X or you need to do Y.
```

The agent can now call `loadSkill("my-skill")` to load the full body. This tool is auto-registered — you don't need to add it to `tools`.

## Runtime Flow

```
User: "Help me do X"
  → Agent sees skill description in system prompt
  → Agent calls loadSkill({ name: "my-skill" })
  → Body loaded into MessageLog
  → Agent reads body and follows instructions
  → Body is discardable — dropped first when context gets full
```

## Best Practices

### 1. Keep descriptions as trigger conditions

```yaml
# ✅ Good
description: Use when implementing a REST API endpoint with input validation.

# ❌ Bad — summarizes the workflow, agent may skip reading the body
description: REST API with Zod validation — define schema, create handler, add tests.
```

### 2. Put reusable reference in the body

The body loads into MessageLog, which is limited. Keep it focused. If a skill body is >500 words, consider splitting into multiple skills.

### 3. Marking skill output as discardable

Skill bodies loaded via `loadSkill` are automatically marked `discardable`. When using `TruncateStrategy`, these are dropped first, before any conversation messages.

### 4. Project vs global skills

```
.halo/skills/      ← Project-level, higher priority
~/.halo/skills/    ← User-level, fallback
```

Place shared skills (team conventions) in project directories. Place personal skills in user directories.
