/**
 * Halo MCP Client
 *
 * Connects to a local stdio MCP server, bridges its tools into a
 * Halo agent, and runs a conversation.
 *
 * Key halo design points:
 *   - MCP tools enter StablePrefix → cached by DeepSeek
 *   - createMCPServer() converts MCP tools to ToolDefinition with auto-execute
 *   - streamText() with tool auto-execute — no manual tool loop
 *
 * Usage:
 *   1. pnpm server:build   (compile MCP server)
 *   2. pnpm server          (in one terminal — starts MCP server on stdio)
 *   3. pnpm client          (in another terminal — Halo agent queries Pokemon)
 */

import "dotenv/config";
import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { createMCPServer } from "@halo-sdk/mcp";

async function main() {
  // ── Connect to MCP server (stdio transport) ──────────────────
  // spawns: node src/dist/server.js
  const mcp = await createMCPServer({
    transport: {
      type: "stdio",
      command: "node",
      args: ["src/dist/server.js"],
    },
  });

  console.log(`MCP server: ${mcp.serverInfo.name} v${mcp.serverInfo.version}`);
  if (mcp.instructions) {
    console.log(`Instructions: ${mcp.instructions}`);
  }

  try {
    // ── Bridge MCP tools → Halo ToolDefinition ─────────────────
    const mcpTools = await mcp.tools();
    console.log(`MCP tools: ${Object.keys(mcpTools).join(", ")}`);

    // ── Create agent ───────────────────────────────────────────
    // MCP tools enter StablePrefix — cached across requests.
    const halo = new Halo({
      adapter: new DeepSeekAdapter({
        apiKey: process.env.DEEPSEEK_API_KEY!,
      }),
    });

    const agent = halo.agent({
      messages: [
        {
          role: "system",
          content:
            "You are a Pokemon expert. Use get-pokemon to look up details. " +
            "Answer questions with accurate data from the tool.",
        },
      ],
      tools: mcpTools,
      model: { temperature: 0.3 },
    });

    // ── Run conversation ───────────────────────────────────────

    console.log("\n─── Conversation ───\n");

    // Turn 1
    {
      console.log("User: Which Pokemon could best defeat Feebas?");
      const stream = agent.streamText(
        "Which Pokemon could best defeat Feebas? Choose one and explain why.",
        {
          maxSteps: 5,
          onStepFinish: ({ step, toolCalls, usage }) => {
            const names = toolCalls.map((tc) => tc.function.name).join(", ");
            console.log(`  [step ${step}] tools: ${names}, tokens: ${usage.promptTokens}`);
          },
        },
      );

      for await (const chunk of stream.toAsyncIterable()) {
        if (chunk.type === "text-delta") {
          process.stdout.write(chunk.delta);
        } else if (chunk.type === "tool-call-ready") {
          console.log(`\n  🔧 ${chunk.call.function.name}("${chunk.call.function.arguments}")`);
        }
      }
      console.log("\n");
    }

    // Turn 2 — cache should hit now (same system + tools)
    {
      console.log("User: Compare Pikachu and Eevee stats.");
      const stream = agent.streamText(
        "Compare the base stats of Pikachu and Eevee. Which has higher speed?",
        { maxSteps: 5 },
      );

      for await (const chunk of stream.toAsyncIterable()) {
        if (chunk.type === "text-delta") {
          process.stdout.write(chunk.delta);
        } else if (chunk.type === "tool-call-ready") {
          console.log(`\n  🔧 ${chunk.call.function.name}("${chunk.call.function.arguments}")`);
        }
      }
      console.log("\n");
    }

    // ── Cache diagnostics ──────────────────────────────────────
    const s = agent.stats;
    console.log("─── Cache Stats ───");
    console.log(`Turns: ${s.turns}`);
    console.log(`Prompt tokens: ${s.totalPromptTokens}`);
    if (s.caching) {
      console.log(`Cache hits: ${s.caching.totalCacheHitTokens} tokens`);
      console.log(`Cache misses: ${s.caching.totalCacheMissTokens} tokens`);
      console.log(`Hit rate: ${(s.caching.cacheHitRate * 100).toFixed(1)}%`);
      if (s.caching.estimatedSavingsUsd !== null) {
        console.log(`Est. savings: $${s.caching.estimatedSavingsUsd.toFixed(6)}`);
      }
    }
  } finally {
    await mcp.close();
  }
}

main().catch(console.error);
