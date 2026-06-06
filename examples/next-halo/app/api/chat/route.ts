import { createWeatherAgent } from "@/agent/weather-agent";

/**
 * POST /api/chat
 *
 * Cache-first weather agent using streamText (preferred API).
 *
 * ── Architecture ──
 *   agent/weather-agent.ts   → Halo factory + agent definition
 *   tool/weather-tool.ts     → Weather tool (spec + execute)
 *   route.ts                 → Thin handler — parse, stream, return
 *
 * ── Cache model ──
 *   StablePrefix (cached):     system prompt + get_weather spec
 *   MessageLog (uncached):     conversation history from useChat
 *
 * streamText replaces the deprecated sdkStream() — it supports
 * named callbacks (onFinish, onError) and returns StreamTextResult
 * with multiple consumption paths.
 */
export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: string; content: string }[];
  };

  const agent = createWeatherAgent();

  return agent
    .streamText(messages, {
      maxSteps: 10,
      onFinish: ({ steps, usage }) => {
        console.log(
          `[chat] ${steps} steps, ${usage.promptTokens}+${usage.completionTokens} tokens`,
        );
      },
      onError: (err) => console.error("[chat]", err.message),
    })
    .toDataStream();
}
