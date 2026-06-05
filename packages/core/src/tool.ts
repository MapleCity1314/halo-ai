import type { ToolDefinition } from "./types.js";
import type { ToolContext } from "./sandbox.js";

/**
 * Create a tool definition with an optional built-in execute function.
 *
 * This is a **type-level identity** — at runtime it returns the input unchanged.
 * It exists purely for TypeScript generic inference on `TArgs`.
 *
 * Two overloads support both single-arg and dual-arg execute signatures.
 * The agent detects `execute.length` at runtime and passes `ctx` only
 * when the function accepts a second parameter.
 */
export function tool<TArgs = Record<string, unknown>>(
  def: ToolDefinition<TArgs> & {
    execute?: (args: TArgs) => string | Promise<string>;
  },
): ToolDefinition<TArgs>;
export function tool<TArgs = Record<string, unknown>>(
  def: ToolDefinition<TArgs> & {
    execute?: (args: TArgs, ctx: ToolContext) => string | Promise<string>;
  },
): ToolDefinition<TArgs>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function tool(def: any): any {
  return def;
}
