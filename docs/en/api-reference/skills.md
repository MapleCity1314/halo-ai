# `discoverSkills()`

Discover Agent Skills from a set of directories, following the [agentskills.io](https://agentskills.io) specification.

## Import

```ts
import { discoverSkills } from "@halo-ai/core";
```

## Signature

```ts
function discoverSkills(opts: {
  directories: string[];
  sandbox?: Sandbox;
}): Promise<SkillMetadata[]>
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `directories` | `string[]` | Directories to scan. Each subdirectory with a `SKILL.md` is a skill. |
| `sandbox` | `Sandbox` | Optional. File reads through sandbox instead of Node `fs`. Cross-platform. |

## Returns

`Promise<SkillMetadata[]>` — deduplicated by name. First discovered skill wins, allowing project-level overrides.

```ts
interface SkillMetadata {
  name: string;        // From SKILL.md YAML frontmatter
  description: string; // From SKILL.md YAML frontmatter
  path: string;        // Absolute path to the skill directory
}
```

## How It Works

1. Scans each directory for subdirectories containing `SKILL.md`.
2. Parses YAML frontmatter (`name`, `description`).
3. Deduplicates by name — project directories override global.
4. Returns metadata. The full body is loaded at runtime by the `loadSkill` tool.

## Usage

```ts
import { Halo, discoverSkills } from "@halo-ai/core";

const skills = await discoverSkills({
  directories: [".halo/skills", "~/.halo/skills"],
});

const agent = halo.agent({
  messages: [{ role: "system", content: "You are helpful." }],
  skills, // name + description → StablePrefix (cached)
});

// Agent can now call: loadSkill("skill-name") → body → MessageLog (uncached)
```

## SKILL.md Format

```markdown
---
name: my-skill
description: One-line trigger description.
---

# My Skill

Full body — loaded when agent calls `loadSkill("my-skill")`.
```

Only `name` and `description` are parsed. Both are required for discovery.

---

# `loadSkill` Tool

Auto-registered when `skills` is non-empty.

**Name:** `loadSkill` (reserved — cannot be user-defined)

**Parameters:** `{ name: string }`

**Behavior:**
1. Lookup skill by name (case-insensitive).
2. Read `${skill.path}/SKILL.md`.
3. Strip YAML frontmatter.
4. Return body as tool output.
5. Result marked `discardable` — dropped first on truncation.
