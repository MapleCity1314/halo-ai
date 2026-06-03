# Deploying to Production

Best practices for deploying Halo agents.

## Environment Variables

Never hardcode API keys. Use environment variables:

```bash
# .env
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

```ts
const adapter = new DeepSeekAdapter({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});
```

## Vercel

```json
// vercel.json
{
  "functions": {
    "app/api/chat/route.ts": {
      "maxDuration": 60
    }
  }
}
```

For streaming responses, ensure the route is configured as a serverless function (App Router default):

```ts
// app/api/chat/route.ts
export const maxDuration = 60; // 60 seconds for long agent runs

export async function POST(req: Request) {
  const { messages } = await req.json();
  const agent = halo.agent({ system: "...", tools: { ... } });
  return toDataStream(agent.sdkStream(messages));
}
```

## Railway / Fly.io

Long-running server deployments. Keep the agent instance alive:

```ts
// Server keeps a single agent for all requests
const halo = new Halo({ adapter: new DeepSeekAdapter({ apiKey }) });
const agent = halo.agent({ system: "...", tools: { ... } });

app.post("/chat", async (req, res) => {
  const { messages } = req.body;
  const response = toDataStream(agent.sdkStream(messages));
  // Stream the response...
});

// Keep cache warm
const keepAlive = agent.keepAlive();
```

## Docker

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --prod
COPY . .
ENV DEEPSEEK_API_KEY=""
CMD ["node", "server.js"]
```

## Performance Tips

### 1. Reuse Agent Instances

```ts
// ✅ One agent, many requests — cache stays warm
const agent = halo.agent({ system: "...", tools: { ... } });

// ❌ New agent per request — cold start every time
app.post("/chat", (req, res) => {
  const agent = halo.agent({ system: "..." });
});
```

### 2. Set Reasonable maxSteps

```ts
// Prevent runaway agent loops in production
const result = await agent.run("Complex task", { maxSteps: 5 });
```

### 3. Use TruncateStrategy for Long Conversations

```ts
import { TruncateStrategy } from "@halo-ai/strategies";
const agent = halo.agent({ context: new TruncateStrategy({ maxTokens: 100_000 }) });
```

### 4. Monitor Stats in Production

```ts
// Log stats periodically
setInterval(() => {
  console.log({
    turns: agent.stats.turns,
    cacheHitRate: agent.stats.caching?.cacheHitRate,
    savings: agent.stats.caching?.estimatedSavingsUsd,
  });
}, 60_000);
```
