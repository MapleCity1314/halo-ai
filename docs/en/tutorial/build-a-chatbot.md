# Build a Chatbot

Build a complete AI chatbot with tool calling, streaming, and cache optimization — step by step.

## Overview

In this tutorial, you'll build a chatbot that can:

- Answer questions conversationally
- Look up the current weather for any city
- Check the time in any timezone
- Stream responses in real-time
- Track and report cache savings

You'll use **Halo Core** for the agent, **Halo Adapters** for the DeepSeek provider, and a simple Express server for the backend.

---

## Step 1: Set Up the Project

```bash
mkdir halo-chatbot && cd halo-chatbot
pnpm init
pnpm add @halo-ai/core @halo-ai/adapters @halo-ai/stream express
pnpm add -D typescript @types/express @types/node tsx
```

Create `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

Create `src/server.ts` — this will be our application entry point.

---

## Step 2: Initialize Halo

```ts
// src/server.ts
import express from "express";
import { Halo, StablePrefix, tool } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";

const app = express();
app.use(express.json());

const halo = new Halo({
  model: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
    model: "deepseek-chat",
  }),
});
```

::: warning API Key
Never hardcode API keys. Set `DEEPSEEK_API_KEY` in your environment:

```bash
export DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
:::

---

## Step 3: Define Tools

```ts
const agent = halo.agent({
  system: `You are a helpful chatbot assistant. You can:
- Answer general questions
- Check the current weather for any city
- Tell the current time in any timezone
Keep responses friendly and concise.`,

  tools: {
    get_weather: tool({
      description: "Get the current weather for a city",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name (e.g. 'Tokyo', 'Paris')",
          },
        },
        required: ["city"],
      },
      execute: async ({ city }) => {
        // Simulated weather data — replace with a real weather API
        const conditions = ["sunny", "cloudy", "rainy", "partly cloudy"];
        const temps = [15, 20, 22, 25, 28, 30];
        const condition = conditions[Math.floor(Math.random() * conditions.length)];
        const temp = temps[Math.floor(Math.random() * temps.length)];
        return `${city}: ${temp}°C, ${condition}`;
      },
    }),

    get_time: tool({
      description: "Get the current time in a timezone",
      parameters: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone name (e.g. 'Asia/Tokyo', 'Europe/Paris')",
          },
        },
        required: ["timezone"],
      },
      execute: async ({ timezone }) => {
        try {
          const now = new Date();
          const time = now.toLocaleTimeString("en-US", { timeZone: timezone });
          const date = now.toLocaleDateString("en-US", { timeZone: timezone });
          return `${timezone}: ${date} ${time}`;
        } catch {
          return `Unknown timezone: ${timezone}`;
        }
      },
    }),
  },
});
```

---

## Step 4: Create Chat Endpoint

```ts
import { toDataStream } from "@halo-ai/stream";

app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages)) {
      return res.status(400).json({ error: "messages must be an array" });
    }

    // Use sdkStream for AI SDK-compatible streaming
    const response = toDataStream(agent.sdkStream(messages));

    // Forward as SSE
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
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
  } catch (err) {
    console.error("Chat error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
```

---

## Step 5: Add Stats Endpoint

```ts
app.get("/api/stats", (req, res) => {
  res.json({
    turns: agent.stats.turns,
    cache: {
      hitRate: agent.stats.caching?.cacheHitRate ?? 0,
      totalHitTokens: agent.stats.caching?.totalCacheHitTokens ?? 0,
      totalMissTokens: agent.stats.caching?.totalCacheMissTokens ?? 0,
      estimatedSavingsUsd: agent.stats.caching?.estimatedSavingsUsd ?? 0,
    },
  });
});
```

---

## Step 6: Start the Server

```ts
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🤖 Halo Chatbot running at http://localhost:${PORT}`);
  console.log(`   POST /api/chat  — send { messages: [...] }`);
  console.log(`   GET  /api/stats — view cache statistics`);
});
```

---

## Step 7: Run and Test

```bash
tsx src/server.ts
```

Test with curl:

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "What is the weather in Tokyo?"}
    ]
  }'
```

Then check your cache stats:

```bash
curl http://localhost:3000/api/stats
```

---

## Step 8: Add a Simple Frontend (Optional)

Create `public/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Halo Chatbot</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    #chat { display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px; }
    .msg { padding: 12px 16px; border-radius: 8px; max-width: 80%; }
    .msg.user { background: #e0e7ff; align-self: flex-end; }
    .msg.assistant { background: #f1f5f9; align-self: flex-start; }
    #input-area { display: flex; gap: 8px; }
    #input { flex: 1; padding: 12px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 16px; }
    button { padding: 12px 24px; background: #4f46e5; color: white; border: none; border-radius: 8px; cursor: pointer; }
  </style>
</head>
<body>
  <h1>🤖 Halo Chatbot</h1>
  <div id="chat"></div>
  <div id="input-area">
    <input id="input" placeholder="Type a message..." />
    <button onclick="send()">Send</button>
  </div>
  <script>
    const chat = document.getElementById("chat");
    const input = document.getElementById("input");
    const messages = [];

    async function send() {
      const content = input.value.trim();
      if (!content) return;
      input.value = "";

      messages.push({ role: "user", content });
      addMsg("user", content);

      const resp = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      });

      const text = await resp.text();
      // Parse SSE stream
      const lines = text.split("\n");
      let assistantContent = "";
      for (const line of lines) {
        if (line.startsWith("0:")) {
          assistantContent += JSON.parse(line.slice(2).trim());
        }
      }
      messages.push({ role: "assistant", content: assistantContent });
      addMsg("assistant", assistantContent);
    }

    function addMsg(role, content) {
      const div = document.createElement("div");
      div.className = `msg ${role}`;
      div.textContent = content;
      chat.appendChild(div);
      chat.scrollTop = chat.scrollHeight;
    }

    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") send();
    });
  </script>
</body>
</html>
```

Add static file serving:

```ts
app.use(express.static("public"));
```

---

## Summary

You've built a complete chatbot with:

- ✅ Multi-turn conversation with cache optimization
- ✅ Tool calling for weather and time
- ✅ SSE streaming responses
- ✅ Cache statistics monitoring
- ✅ A simple web frontend

## Next Steps

- [Deploy to production](/en/guides/deploying)
- [Add custom tool calling](/en/guides/tool-calling)
- [Explore provider options](/en/getting-started/choosing-a-provider)
