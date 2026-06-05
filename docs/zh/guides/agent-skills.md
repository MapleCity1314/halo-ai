# Agent Skills

Agent Skills 遵循 [agentskills.io](https://agentskills.io) 渐进披露模式：元数据进系统提示（缓存），正文按需加载（不缓存）。

## 工作原理

```
1. discoverSkills() → 读取 SKILL.md frontmatter → name + description
2. halodem({ skills })  → name + description 进入 StablePrefix（缓存）
3. Agent 运行时调用 loadSkill("skill-name")
4. 正文从磁盘加载 → 进入 MessageLog（不缓存，可丢弃）
5. ContextStrategy 截断时可优先丢弃 skill 正文
```

前缀保持精简（每个 skill 仅一行），同时让 agent 在需要时获取详细指令。

## 发现 Skills

```ts
import { discoverSkills } from "@halo-ai/core";

const skills = await discoverSkills({
  directories: [".halo/skills", "~/.halo/skills"],
});
```

扫描规则：
- 每个包含 `SKILL.md` 的子目录为一个 Skill
- 从 YAML frontmatter 解析 `name` 和 `description`
- 同名 Skill 先发现的胜出（项目覆盖全局）

## 编写 Skill

创建 `skills/my-skill/SKILL.md`：

```markdown
---
name: my-skill
description: 当用户询问 X 或需要做 Y 时使用。
---

# My Skill

详细的指令、模式和示例放在这里。
Agent 调用 loadSkill("my-skill") 时加载此正文。
```

**描述至关重要** — 它是 agent 在决定加载正文前看到的唯一内容。写为触发条件（"当…时使用"），而非正文摘要。

## 在 Agent 中使用 Skills

```ts
const agent = halo.agent({
  messages: [{ role: "system", content: "你是一个有用的助手。" }],
  skills,
  tools: { ... },
});

// 系统提示中现在包含：
// ## Available Skills
// - my-skill: 当用户询问 X 或需要做 Y 时使用。
```

Agent 现在可以调用 `loadSkill("my-skill")` 加载完整正文。此工具自动注册 — 无需手动添加到 `tools`。

## 运行时流程

```
用户: "帮我做 X"
  → Agent 在系统提示中看到 skill 描述
  → Agent 调用 loadSkill({ name: "my-skill" })
  → 正文加载到 MessageLog
  → Agent 阅读正文并按照指令执行
  → 正文标记为 discardable — 上下文满时优先丢弃
```

## 最佳实践

### 1. 描述保持为触发条件

```yaml
# ✅ 正确
description: 当实现带有输入验证的 REST API 端点时使用。

# ❌ 错误 — 总结了工作流，agent 可能跳过阅读正文
description: 带 Zod 验证的 REST API — 定义 schema，创建 handler，添加测试。
```

### 2. 正文保持聚焦

正文加载到 MessageLog 中，空间有限。保持精简。如果 skill 正文超过 500 字，考虑拆分为多个 skill。

### 3. Skill 输出标记为可丢弃

通过 `loadSkill` 加载的 skill 正文自动标记为 `discardable`。当使用 `TruncateStrategy` 时，优先在任何对话消息之前丢弃。

### 4. 项目 vs 全局 skill

```
.halo/skills/      ← 项目级，更高优先级
~/.halo/skills/    ← 用户级，回退
```

共享 skill（团队规范）放在项目目录。个人 skill 放在用户目录。
