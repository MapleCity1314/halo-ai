import { toDataStream } from "@halo-ai/stream";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { Halo, tool } from "@halo-ai/core";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

/**
 * POST /api/chat
 *
 * Cache-first weather agent. Each request hydrates prior history
 * and streams the response. The system prompt + tools form a stable
 * prefix that DeepSeek caches across requests.
 */
export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: string; content: string }[];
  };

  const agent = halo.agent({
    system:
      "You are a helpful weather assistant. When asked about weather, use get_weather. Reply in the user's language.",
    tools: {
      get_weather: tool({
        description: "Get current weather for a city",
        parameters: {
          type: "object",
          properties: {
            city: {
              type: "string",
              description: "City name",
            },
          },
          required: ["city"],
        },
        execute: async ({ city }: { city: string }) => {
          const weather: Record<string, string> = {
            beijing: "Beijing: 5°C, clear sky, humidity 30%",
            shanghai: "Shanghai: 12°C, cloudy, humidity 65%",
            tokyo: "Tokyo: 8°C, light rain, humidity 80%",
            paris: "Paris: 11°C, partly cloudy, humidity 55%",
            london: "London: 7°C, drizzle, humidity 75%",
            "new york": "New York: 2°C, snow, humidity 60%",
          };
          const key = city.toLowerCase();
          return weather[key] ?? `${city}: 20°C, sunny, humidity 40%`;
        },
      }),
    },
  });

  return toDataStream(agent.sdkStream(messages));
}
