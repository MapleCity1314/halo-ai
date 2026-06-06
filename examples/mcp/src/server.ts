/**
 * MCP Server — Pokemon API
 *
 * A minimal MCP server exposing Pokemon data via stdio transport.
 * Build with `pnpm server:build`, then run with `pnpm server`.
 *
 * Tools exposed:
 *   - get-pokemon: Get Pokemon details by name (type, abilities, stats)
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const POKE_API = "https://pokeapi.co/api/v2";

interface Pokemon {
  name: string;
  types: { type: { name: string } }[];
  abilities: { ability: { name: string } }[];
  stats: { base_stat: number; stat: { name: string } }[];
}

async function fetchPokemon(name: string): Promise<Pokemon | null> {
  try {
    const res = await fetch(`${POKE_API}/pokemon/${name.toLowerCase()}`);
    if (!res.ok) return null;
    return (await res.json()) as Pokemon;
  } catch {
    return null;
  }
}

const server = new McpServer({
  name: "pokemon-mcp",
  version: "1.0.0",
});

server.tool(
  "get-pokemon",
  "Get Pokemon details by name — returns type, abilities, and base stats",
  { name: z.string().describe("Pokemon name (e.g. pikachu, charizard)") },
  async ({ name }) => {
    const pokemon = await fetchPokemon(name);
    if (!pokemon) {
      return {
        content: [{ type: "text" as const, text: `Pokemon "${name}" not found.` }],
      };
    }

    const types = pokemon.types.map((t) => t.type.name).join(", ");
    const abilities = pokemon.abilities.map((a) => a.ability.name).join(", ");
    const stats = pokemon.stats.map((s) => `${s.stat.name}: ${s.base_stat}`).join(", ");

    return {
      content: [
        {
          type: "text" as const,
          text: [
            `Name: ${pokemon.name}`,
            `Types: ${types}`,
            `Abilities: ${abilities}`,
            `Base stats: ${stats}`,
          ].join("\n"),
        },
      ],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr so stdout (stdio transport) stays clean
  console.error("Pokemon MCP Server running on stdio");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
