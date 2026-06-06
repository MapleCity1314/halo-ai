import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

// ── Cache-first Halo setup ────────────────────────────────────────

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

const tools = {
  get_weather: tool({
    description: "Get current weather for a city",
    parameters: {
      type: "object",
      properties: { city: { type: "string" } },
      required: ["city"],
    },
    execute: async ({ city }: { city: string }) => {
      const data: Record<string, string> = {
        beijing: "5°C, clear",
        tokyo: "8°C, light rain",
        paris: "11°C, partly cloudy",
      };
      return data[city.toLowerCase()] ?? `${city}: 20°C, sunny`;
    },
  }),
  get_time: tool({
    description: "Get the current date and time in ISO 8601",
    parameters: { type: "object", properties: {}, required: [] },
    execute: async () => new Date().toISOString(),
  }),
};

// ── Hono app ───────────────────────────────────────────────────────

const app = new Hono();

// CORS — allow localhost:3000 (Next.js dev server)
app.use(
  "/api/chat/*",
  cors({
    origin: ["http://localhost:3000"],
    allowMethods: ["GET", "POST", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  }),
);

/**
 * POST /api/chat
 *
 * Standard SSE streaming with toDataStream().
 * Returns AI SDK-compatible SSE (0:/9:/d: protocol).
 */
app.post("/api/chat", async (c) => {
  const { messages } = await c.req.json<{
    messages: { role: string; content: string }[];
  }>();

  const agent = halo.agent({
    messages: [
      {
        role: "system",
        content: "You are a helpful assistant. Reply concisely.",
      },
    ],
    tools,
    model: { temperature: 0.7 },
  });

  const response = agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) =>
        console.log(`[chat] ${steps} steps, ${usage.promptTokens}+${usage.completionTokens}t`),
      onError: (err) => console.error("[chat]", err.message),
    })
    .toDataStream();

  return new Response(response.body, {
    status: response.status,
    headers: response.headers,
  });
});

/**
 * POST /api/chat/readable-stream
 *
 * Binary ReadableStream consumption path.
 * Useful for piping to file, or non-SSE transports.
 */
app.post("/api/chat/readable-stream", async (c) => {
  const { messages } = await c.req.json<{
    messages: { role: string; content: string }[];
  }>();

  const agent = halo.agent({
    messages: [{ role: "system", content: "Reply as concisely as possible." }],
    tools,
  });

  const stream = agent.streamText(messages, { maxSteps: 5 }).toReadableStream();

  return new Response(stream, {
    headers: { "Content-Type": "application/octet-stream" },
  });
});

/**
 * POST /api/chat/async-iterable
 *
 * Demonstrates toAsyncIterable() — full per-chunk control.
 * Each chunk is emitted as a JSON line (NDJSON).
 */
app.post("/api/chat/async-iterable", async (c) => {
  const { messages } = await c.req.json<{
    messages: { role: string; content: string }[];
  }>();

  const agent = halo.agent({
    messages: [{ role: "system", content: "Reply concisely." }],
    tools,
  });

  const stream = agent.streamText(messages, { maxSteps: 5 });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      for await (const chunk of stream.toAsyncIterable()) {
        controller.enqueue(encoder.encode(JSON.stringify(chunk) + "\n"));
      }
      controller.close();
    },
  });

  return new Response(readable, {
    headers: { "Content-Type": "application/x-ndjson" },
  });
});

/**
 * GET /health
 */
app.get("/health", (c) => c.text("Halo Hono server is running!"));

// ── Start ──────────────────────────────────────────────────────────

console.log("🚀 Halo Hono server starting on http://localhost:8080");
serve({ fetch: app.fetch, port: 8080 });
