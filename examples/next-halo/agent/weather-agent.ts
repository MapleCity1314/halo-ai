import { Halo } from "@halo-sdk/core";
import { DeepSeekAdapter } from "@halo-sdk/adapters";
import { weatherTool } from "@/tool/weather-tool";

/**
 * Cache-first weather agent factory.
 *
 * The Halo instance holds the DeepSeek adapter and is shared across
 * requests. Each request creates a fresh HaloAgent — the StablePrefix
 * (system prompt + weatherTool spec) is fingerprinted identically,
 * so DeepSeek reuses the KV-cache across all requests.
 */
const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

/**
 * Create a per-request weather agent.
 *
 * Uses `messages` (preferred) for the system prompt.
 * Tool auto-execute: `weatherTool.execute` runs automatically
 * when the model calls `get_weather`.
 */
export function createWeatherAgent() {
  return halo.agent({
    messages: [
      {
        role: "system",
        content:
          "You are a helpful weather assistant. When asked about weather, " +
          "use get_weather. Reply in the user's language.",
      },
    ],
    tools: {
      get_weather: weatherTool,
    },
    model: { temperature: 0.7 },
  });
}
