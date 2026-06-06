import "dotenv/config";
import { createServer } from "node:http";
import { Halo, tool } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";

// ── Cache-first Halo setup ────────────────────────────────────────
// Zero-framework dependency — only Node built-ins.
// The StablePrefix (system prompt + tool specs) is cached by DeepSeek.

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

// ── Tools ──────────────────────────────────────────────────────────

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
};

// ── Helpers ────────────────────────────────────────────────────────

function parseBody(req: Parameters<Parameters<typeof createServer>[0]>[0]): Promise<string> {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk: Buffer) => (body += chunk.toString()));
    req.on("end", () => resolve(body));
  });
}

function sendJSON(
  res: Parameters<Parameters<typeof createServer>[0]>[1],
  data: unknown,
  status = 200,
) {
  const json = JSON.stringify(data);
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(json);
}

// ── Server ─────────────────────────────────────────────────────────

createServer(async (req, res) => {
  const url = req.url ?? "/";

  // ── POST /api/chat — SSE streaming via toDataStream ──────────

  if (req.method === "POST" && url === "/api/chat") {
    const body = await parseBody(req);
    const { messages } = JSON.parse(body) as {
      messages: { role: string; content: string }[];
    };

    const agent = halo.agent({
      messages: [{ role: "system", content: "You are a helpful assistant. Reply concisely." }],
      tools,
    });

    // streamText with toDataStream() — returns a standard Response object
    const response = agent
      .streamText(messages, {
        maxSteps: 10,
        onFinish: ({ steps, usage }) =>
          console.log(`[chat] ${steps} steps, ${usage.promptTokens}+${usage.completionTokens}t`),
        onError: (err) => console.error("[chat]", err.message),
      })
      .toDataStream();

    // Forward headers and pipe body
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
    return;
  }

  // ── POST /api/chat/custom-sse — custom SSE via toAsyncIterable ──

  if (req.method === "POST" && url === "/api/chat/custom-sse") {
    const body = await parseBody(req);
    const { messages } = JSON.parse(body) as {
      messages: { role: string; content: string }[];
    };

    const agent = halo.agent({
      messages: [{ role: "system", content: "You are a helpful assistant." }],
      tools,
    });

    const stream = agent.streamText(messages, { maxSteps: 10 });

    // Custom SSE format using toAsyncIterable() for full control
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });

    for await (const chunk of stream.toAsyncIterable()) {
      switch (chunk.type) {
        case "text-delta":
          res.write(`event: text\ndata: ${JSON.stringify(chunk.delta)}\n\n`);
          break;
        case "tool-call-ready":
          res.write(`event: tool\ndata: ${JSON.stringify({ name: chunk.call.function.name })}\n\n`);
          break;
        case "done":
          res.write(`event: done\ndata: ${JSON.stringify(chunk.usage)}\n\n`);
          break;
      }
    }
    res.end();
    return;
  }

  // ── GET /stats ────────────────────────────────────────────────

  if (req.method === "GET" && url === "/stats") {
    const agent = halo.agent({
      messages: [{ role: "system", content: "Stats probe." }],
    });
    sendJSON(res, agent.stats);
    return;
  }

  // ── 404 ───────────────────────────────────────────────────────

  sendJSON(res, { error: "Not found" }, 404);
}).listen(8080, () => {
  console.log("🚀 Halo HTTP server on http://localhost:8080");
  console.log("   POST /api/chat          — SSE via toDataStream (AI SDK protocol)");
  console.log("   POST /api/chat/custom-sse — custom SSE via toAsyncIterable");
  console.log("   GET  /stats             — agent statistics");
});
