import "dotenv/config";
import express from "express";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

// ── Cache-first Halo setup ────────────────────────────────────────
// The adapter is created once and shared across all agent instances.
// DeepSeek prefix caching is enabled by default — the system prompt
// and tool specs form a StablePrefix that gets cached server-side.

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

// ── Express app ────────────────────────────────────────────────────

const app = express();
app.use(express.json());

/**
 * POST /api/chat
 *
 * Cache-first agent with tool auto-execute.
 *
 * StablePrefix (cached):     system prompt + tool names/descriptions/parameters
 * MessageLog (uncached):     conversation history (user/assistant/tool messages)
 *
 * Tools with `execute` functions run automatically — no manual tool loop needed.
 */
app.post("/api/chat", async (req, res) => {
  const { messages } = req.body as {
    messages: { role: string; content: string }[];
  };

  // Each request creates a fresh agent. The StablePrefix fingerprint is
  // identical across requests → DeepSeek reuses the KV-cache.
  const agent = halo.agent({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Reply in the user's language.",
      },
    ],
    tools: {
      get_weather: tool({
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name (e.g. Beijing, Tokyo)",
            },
          },
          required: ["city"],
        },
        execute: async ({ city }: { city: string }) => {
          const data: Record<string, string> = {
            beijing: "5°C, clear sky, humidity 30%",
            shanghai: "12°C, cloudy, humidity 65%",
            tokyo: "8°C, light rain, humidity 80%",
            paris: "11°C, partly cloudy, humidity 55%",
            london: "7°C, drizzle, humidity 75%",
            "new york": "2°C, snow, humidity 60%",
          };
          return data[city.toLowerCase()] ?? `${city}: 20°C, sunny`;
        },
      }),
      get_time: tool({
        description: "Get the current date and time",
        parameters: { type: "object", properties: {}, required: [] },
        execute: async () => new Date().toISOString(),
      }),
    },
    model: { temperature: 0.7 },
  });

  // streamText accepts ChatMessage[] from AI SDK useChat —
  // hydrates prior history into MessageLog, streams the response.
  const response = agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) => {
        console.log(
          `[chat] ${steps} steps, ` + `${usage.promptTokens}+${usage.completionTokens} tokens`,
        );
      },
      onError: (err) => console.error("[chat] error:", err.message),
    })
    .toDataStream();

  // Forward SSE headers and stream body to Express response
  res.writeHead(response.status, {
    "Content-Type": response.headers.get("Content-Type") ?? "text/event-stream",
    "Cache-Control": response.headers.get("Cache-Control") ?? "no-cache",
    Connection: response.headers.get("Connection") ?? "keep-alive",
  });

  const reader = response.body?.getReader();
  if (!reader) {
    res.end();
    return;
  }

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  } finally {
    reader.releaseLock();
    res.end();
  }
});

/**
 * GET /stats
 *
 * Returns per-request agent statistics: cache hit rate,
 * token usage, and pricing snapshot.
 */
app.get("/stats", (_req, res) => {
  // Create a one-shot agent just to read the shared adapter's
  // pricing info (cached input vs full input pricing).
  const agent = halo.agent({
    messages: [{ role: "system", content: "Stats probe — not used for chat." }],
  });

  res.json({
    ...agent.stats,
    note: "Per-agent stats (fresh instance). Use HaloSession for long-lived tracking.",
  });
});

// ── Start ──────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log(`🚀 Halo Express server on http://localhost:${PORT}`);
  console.log(`   POST /api/chat  — send { messages: [...] }`);
  console.log(`   GET  /stats     — agent statistics`);
});
