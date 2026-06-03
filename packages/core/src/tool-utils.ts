import type { ToolSpec, ToolDefinition } from "./types.js";

/** Convert a named ToolDefinition to a ToolSpec. */
export function definitionToSpec(name: string, def: ToolDefinition): ToolSpec {
  return {
    type: "function",
    function: {
      name,
      description: def.description,
      parameters: def.parameters,
    },
  };
}

/** Result of normalizing tool inputs: flat specs + executor map. */
export interface NormalizedTools {
  toolSpecs: ToolSpec[];
  executors: Map<string, (args: Record<string, unknown>) => string | Promise<string>>;
}

/**
 * Normalize tools from either a flat array of ToolSpec objects or a
 * named record of ToolDefinition objects into a unified representation.
 */
export function normalizeTools(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tools: ToolSpec[] | Record<string, ToolDefinition<any>> | undefined,
): NormalizedTools {
  const executors = new Map<string, (args: Record<string, unknown>) => string | Promise<string>>();

  if (!tools) return { toolSpecs: [], executors };

  if (Array.isArray(tools)) {
    return { toolSpecs: tools, executors };
  }

  const specs: ToolSpec[] = [];
  for (const [name, def] of Object.entries(tools)) {
    specs.push(definitionToSpec(name, def));
    if (def.execute) {
      executors.set(
        name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        def.execute as (args: Record<string, unknown>) => string | Promise<string>,
      );
    }
  }

  return { toolSpecs: specs, executors };
}
