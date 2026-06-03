import type { ToolDefinition } from "./types.js";

/**
 * Create a tool definition with an optional built-in execute function.
 *
 * This is a **type-level identity** — at runtime it returns the input unchanged.
 * It exists purely for TypeScript generic inference on `TArgs`.
 *
 * @example
 * ```ts
 * const weatherTool = tool({
 *   description: "Get the weather for a city",
 *   parameters: {
 *     type: "object",
 *     properties: { city: { type: "string" } },
 *     required: ["city"],
 *   },
 *   execute: async ({ city }) => `Sunny, 22°C in ${city}`,
 * });
 * ```
 */
export function tool<TArgs = Record<string, unknown>>(
  def: ToolDefinition<TArgs>,
): ToolDefinition<TArgs> {
  return def;
}
