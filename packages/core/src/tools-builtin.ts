import type { ToolDefinition } from "./types.js";

/** Safe calculator: evaluates arithmetic expressions with a whitelist. */
export function calculator(): ToolDefinition<{ expression: string }> {
  return {
    description:
      "Evaluate a mathematical expression. Supports +, -, *, /, %, **, parentheses, and decimals.",
    parameters: {
      type: "object",
      properties: {
        expression: {
          type: "string",
          description: "The arithmetic expression to evaluate.",
        },
      },
      required: ["expression"],
    },
    execute: ({ expression }) => {
      // Whitelist: only allow safe characters.
      if (!/^[0-9+\-*/().%\s]+$/.test(expression)) {
        return `Error: expression contains disallowed characters. Only 0-9, +, -, *, /, (, ), ., %, whitespace allowed.`;
      }
      try {
        const result = new Function(`"use strict"; return (${expression})`)();
        if (typeof result !== "number" || !isFinite(result)) {
          return `Error: expression did not evaluate to a finite number.`;
        }
        return String(result);
      } catch (err) {
        return `Error evaluating expression: ${String(err)}`;
      }
    },
  };
}

/** Time utilities: now, parse, convert between timezones. */
export function datetime(): ToolDefinition<{
  operation: string;
  value?: string;
  tz?: string;
}> {
  return {
    description: `
Date and time utilities. Operations:
- "now": get current time in a timezone (default: UTC)
- "parse": parse a date string and return ISO 8601
- "convert": convert a date string from one timezone to another
`.trim(),
    parameters: {
      type: "object",
      properties: {
        operation: {
          type: "string",
          enum: ["now", "parse", "convert"],
          description: "The operation to perform.",
        },
        value: {
          type: "string",
          description:
            "Date string for parse/convert operations (ISO 8601 preferred).",
        },
        tz: {
          type: "string",
          description: "Timezone identifier (e.g. 'Asia/Shanghai', 'America/New_York').",
        },
      },
      required: ["operation"],
    },
    execute: ({ operation, value, tz }) => {
      try {
        switch (operation) {
          case "now": {
            const now = new Date();
            if (tz) {
              try {
                return now.toLocaleString("en-US", { timeZone: tz });
              } catch {
                return `Error: unknown timezone "${tz}". Falling back to UTC: ${now.toISOString()}`;
              }
            }
            return now.toISOString();
          }
          case "parse": {
            if (!value) return "Error: 'value' is required for parse operation.";
            const d = new Date(value);
            if (isNaN(d.getTime())) {
              return `Error: could not parse "${value}" as a date. Use ISO 8601 format.`;
            }
            return d.toISOString();
          }
          case "convert": {
            if (!value) return "Error: 'value' is required for convert operation.";
            if (!tz) return "Error: 'tz' is required for convert operation.";
            const d = new Date(value);
            if (isNaN(d.getTime())) {
              return `Error: could not parse "${value}" as a date.`;
            }
            try {
              return d.toLocaleString("en-US", { timeZone: tz });
            } catch {
              return `Error: unknown timezone "${tz}".`;
            }
          }
          default:
            return `Error: unknown operation "${operation}". Use "now", "parse", or "convert".`;
        }
      } catch (err) {
        return `Error: ${String(err)}`;
      }
    },
  };
}
