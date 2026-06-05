# `discoverSkills()`

从指定目录发现 Agent Skills，遵循 [agentskills.io](https://agentskills.io) 规范。

## 导入

```ts
import { discoverSkills } from "@halo-ai/core";
```

## 签名

```ts
function discoverSkills(opts: {
  directories: string[];
  sandbox?: Sandbox;
}): Promise<SkillMetadata[]>
```

## 参数

| 参数 | 类型 | 说明 |
|---|---|---|
| `directories` | `string[]` | 要扫描的目录。每个包含 `SKILL.md` 的子目录为一个 Skill。 |
| `sandbox` | `Sandbox` | 可选。通过沙箱读取文件而非 Node `fs`，支持跨平台（浏览器、Edge）。 |

## 返回值

`Promise<SkillMetadata[]>` — 按名称去重。先发现的 Skill 胜出，允许项目级覆盖全局。

```ts
interface SkillMetadata {
  name: string;        // 来自 SKILL.md YAML frontmatter
  description: string; // 来自 SKILL.md YAML frontmatter
  path: string;        // Skill 目录的绝对路径
}
```

## 工作流程

1. 扫描每个目录下包含 `SKILL.md` 的子目录。
2. 解析 YAML frontmatter（`name`、`description`）。
3. 按名称去重 — 项目目录覆盖全局。
4. 返回元数据。完整正文在运行时由 `loadSkill` 工具加载。

## 用法

```ts
import { Halo, discoverSkills } from "@halo-ai/core";

const skills = await discoverSkills({
  directories: [".halo/skills", "~/.halo/skills"],
});

const agent = halo.agent({
  messages: [{ role: "system", content: "你是一个有用的助手。" }],
  skills, // name + description → StablePrefix（被缓存）
});

// Agent 现在可以调用: loadSkill("skill-name") → 正文 → MessageLog（不缓存）
```

## SKILL.md 格式

```markdown
---
name: my-skill
description: 何时使用这个 Skill 的一句话描述。
---

# My Skill

完整正文 — agent 调用 loadSkill("my-skill") 时加载。
```

只有 `name` 和 `description` 会被解析。两者都是发现 Skill 的必要条件。

---

# `loadSkill` 工具

当 `skills` 非空时自动注册。

**名称:** `loadSkill`（保留关键字 — 用户不能自定义同名工具）

**参数:** `{ name: string }`

**行为:**
1. 按名称查找 Skill（不区分大小写）。
2. 读取 `${skill.path}/SKILL.md`。
3. 去除 YAML frontmatter。
4. 返回正文作为工具输出。
5. 结果标记为 `discardable` — 上下文截断时优先丢弃。
