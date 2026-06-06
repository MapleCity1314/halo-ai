import "dotenv/config";
import * as readline from "node:readline";
import * as fs from "node:fs/promises";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

// ── Cache-first Halo setup ────────────────────────────────────────
//
// One agent instance for the whole session. The StablePrefix
// (system prompt + tool specs) is fingerprinted once. DeepSeek
// caches it server-side — all subsequent turns hit the cache.

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

// ── Agent ──────────────────────────────────────────────────────────

const agent = halo.agent({
  messages: [
    {
      role: "system",
      content:
        "You are a helpful CLI assistant. Keep responses concise (2-3 sentences max). " +
        "Use tools when helpful. Reply in the user's language.",
    },
  ],
  tools: {
    get_time: tool({
      description: "Get the current date and time in ISO 8601 format",
      parameters: { type: "object", properties: {}, required: [] },
      execute: async () => new Date().toISOString(),
    }),
    read_file: tool({
      description: "Read the contents of a file from the filesystem",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "Absolute or relative file path" },
        },
        required: ["path"],
      },
      execute: async ({ path }: { path: string }) => {
        try {
          return await fs.readFile(path, "utf-8");
        } catch (err) {
          return `Error reading file: ${(err as Error).message}`;
        }
      },
    }),
    calculator: tool({
      description: "Evaluate a mathematical expression (supports +, -, *, /, %, **, parens)",
      parameters: {
        type: "object",
        properties: {
          expression: { type: "string", description: "Math expression, e.g. '(3 + 5) * 2'" },
        },
        required: ["expression"],
      },
      execute: async ({ expression }: { expression: string }) => {
        try {
          // Safe eval — only allow numbers, operators, parens, and whitespace
          if (!/^[\d\s+\-*/%.()**]+$/.test(expression)) {
            return "Error: expression contains disallowed characters.";
          }
          const result = Function(`"use strict"; return (${expression})`)();
          return String(result);
        } catch (err) {
          return `Error: ${(err as Error).message}`;
        }
      },
    }),
  },
  model: { temperature: 0.7, maxTokens: 1024 },
});

// ── Keep-alive ─────────────────────────────────────────────────────
// Long-running CLI session — start keep-alive to prevent server-side
// KV cache expiry (DeepSeek expires after ~5 min inactivity).

const { stop: stopKeepAlive } = agent.keepAlive(120_000); // ping every 2 min

// ── Readline ───────────────────────────────────────────────────────

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: "> ",
});

function ask(question: string): Promise<string> {
  return new Promise((resolve) => rl.question(question, resolve));
}

// ── Main loop ──────────────────────────────────────────────────────

async function main() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   Halo CLI Agent — cache-first AI assistant  ║");
  console.log("╠══════════════════════════════════════════════╣");
  console.log("║   Tools: get_time, read_file, calculator     ║");
  console.log("║   Type 'exit' to quit, '/stats' for cache    ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  while (true) {
    const input = await ask("> ");
    const trimmed = input.trim();

    if (trimmed === "exit" || trimmed === "quit") break;

    // ── /stats — show cache diagnostics ───────────────────────

    if (trimmed === "/stats") {
      const s = agent.stats;
      console.log(`\n  Turns: ${s.turns}`);
      console.log(`  Prompt tokens: ${s.totalPromptTokens}`);
      console.log(`  Completion tokens: ${s.totalCompletionTokens}`);
      if (s.caching) {
        console.log(`  Cache hits: ${s.caching.totalCacheHitTokens} tokens`);
        console.log(`  Cache misses: ${s.caching.totalCacheMissTokens} tokens`);
        console.log(`  Hit rate: ${(s.caching.cacheHitRate * 100).toFixed(1)}%`);
        if (s.caching.estimatedSavingsUsd !== null) {
          console.log(`  Estimated savings: $${s.caching.estimatedSavingsUsd.toFixed(6)}`);
        }
      }
      console.log();
      continue;
    }

    if (!trimmed) continue;

    // ── generateText — tool auto-execute loop ─────────────────

    try {
      process.stdout.write("🤖 ");
      const result = await agent.generateText(trimmed, {
        maxSteps: 8,
        onStep: ({ step, toolCalls }) => {
          if (toolCalls.length > 0) {
            const names = toolCalls.map((tc) => tc.function.name).join(", ");
            process.stdout.write(`\n   🔧 step ${step}: ${names}\n🤖 `);
          }
        },
      });
      console.log(result.content);
      console.log(); // blank line between turns
    } catch (err) {
      console.error(`\n  Error: ${(err as Error).message}\n`);
    }
  }

  // ── Shutdown ─────────────────────────────────────────────────

  stopKeepAlive();

  const s = agent.stats;
  console.log(`\nSession summary:`);
  console.log(`  ${s.turns} turns, ${s.totalPromptTokens}+${s.totalCompletionTokens} tokens`);
  if (s.caching) {
    console.log(`  Cache hit rate: ${(s.caching.cacheHitRate * 100).toFixed(1)}%`);
  }

  rl.close();
  process.exit(0);
}

// ── Handle Ctrl+C gracefully ───────────────────────────────────────

process.on("SIGINT", () => {
  console.log("\nShutting down...");
  stopKeepAlive();
  rl.close();
  process.exit(0);
});

main();
