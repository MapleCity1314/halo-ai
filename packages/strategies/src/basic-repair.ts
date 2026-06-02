import type { ToolCall, RepairStrategy, RepairResult } from "@halo-ai/core";

export class BasicRepair implements RepairStrategy {
  repair(toolCalls: ToolCall[], _rawContent: string): RepairResult {
    const repaired: ToolCall[] = [];
    let fixed = 0;

    for (const call of toolCalls) {
      const args = call.function?.arguments ?? "";
      const fix = tryFixTruncatedJson(args);
      if (fix !== args) {
        fixed++;
        repaired.push({
          ...call,
          function: { ...call.function, arguments: fix },
        });
      } else {
        repaired.push(call);
      }
    }

    return {
      toolCalls: repaired,
      fixed,
      scavenged: 0,
      suppressed: 0,
      notes: fixed > 0 ? [`fixed ${fixed} truncated JSON argument(s)`] : [],
    };
  }
}

function tryFixTruncatedJson(raw: string): string {
  if (!raw || !raw.trim()) return raw;

  // Try direct parse first.
  try {
    JSON.parse(raw);
    return raw;
  } catch {
    /* needs fixing */
  }

  // Count unbalanced brackets and braces.
  let braces = 0;
  let brackets = 0;
  let inString = false;
  let escaped = false;

  for (const ch of raw) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === "{") braces++;
    if (ch === "}") braces--;
    if (ch === "[") brackets++;
    if (ch === "]") brackets--;
  }

  // Also fix unterminated string.
  if (inString) {
    let fixed = raw;
    // Close the string before closing brackets.
    if (braces > 0 || brackets > 0) fixed += '"';
    while (braces > 0) {
      fixed += "}";
      braces--;
    }
    while (brackets > 0) {
      fixed += "]";
      brackets--;
    }
    return fixed;
  }

  let fixed = raw;
  while (braces > 0) {
    fixed += "}";
    braces--;
  }
  while (brackets > 0) {
    fixed += "]";
    brackets--;
  }

  // Verify the fix is valid JSON.
  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    return raw;
  }
}
