import { readdir, readFile } from "node:fs/promises";
import type { SkillMetadata } from "./session.js";
import type { Sandbox } from "./sandbox.js";

/**
 * Discover Agent Skills from a set of directories.
 *
 * Scans each directory for subdirectories containing a `SKILL.md` file,
 * parses the YAML frontmatter (`name`, `description`), and returns
 * deduplicated metadata (first skill with a given name wins — allows
 * project-level overrides).
 *
 * When `sandbox` is provided, file operations use the sandbox abstraction
 * instead of raw Node `fs` (enables cross-platform/browser usage).
 * Without sandbox, falls back to `node:fs/promises` (**@nodeOnly**).
 *
 * @example
 * ```ts
 * const skills = await discoverSkills({
 *   directories: [".halo/skills"],
 *   sandbox: new VirtualSandbox(),
 * });
 * ```
 */
export async function discoverSkills(opts: {
  directories: string[];
  sandbox?: Sandbox;
}): Promise<SkillMetadata[]> {
  const sb = opts.sandbox;
  const skills: SkillMetadata[] = [];
  const seen = new Set<string>();

  for (const dir of opts.directories) {
    let entries: { name: string; isDirectory: boolean }[];
    try {
      if (sb) {
        entries = await sb.readdir(dir);
      } else {
        const raw = await readdir(dir, { withFileTypes: true });
        entries = raw.map((e) => ({ name: e.name, isDirectory: e.isDirectory() }));
      }
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isDirectory) continue;

      const skillDir = `${dir}/${entry.name}`.replace(/\/+/g, "/");
      const skillFile = `${skillDir}/SKILL.md`;

      try {
        const content = sb ? await sb.readFile(skillFile) : await readFile(skillFile, "utf-8");
        const frontmatter = parseFrontmatter(content);

        if (!frontmatter.name || !frontmatter.description) continue;
        if (seen.has(frontmatter.name)) continue;

        seen.add(frontmatter.name);
        skills.push({
          name: frontmatter.name,
          description: frontmatter.description,
          path: skillDir,
        });
      } catch {
        // SKILL.md missing or unreadable — skip.
        continue;
      }
    }
  }

  return skills;
}

/**
 * Extract name and description from YAML frontmatter.
 * Lightweight parser: only supports string values for `name` and `description`.
 */
function parseFrontmatter(content: string): {
  name?: string;
  description?: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) return {};

  const yaml = match[1];
  const name = extractYamlString(yaml, "name");
  const description = extractYamlString(yaml, "description");

  return { name, description };
}

function extractYamlString(yaml: string, key: string): string | undefined {
  const re = new RegExp(`^${key}:\\s*["']?(.+?)["']?\\s*$`, "m");
  const match = yaml.match(re);
  return match?.[1]?.trim();
}
