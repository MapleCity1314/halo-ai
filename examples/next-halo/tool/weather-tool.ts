import { tool } from "@halo-sdk/core";

/**
 * Weather lookup tool.
 *
 * The tool spec (name, description, parameters) enters StablePrefix
 * and is cached by DeepSeek. The `execute` function does NOT enter
 * the prefix — safe to change without cache miss.
 */
export const weatherTool = tool<{ city: string }>({
  description: "Get current weather for a city",
  parameters: {
    type: "object",
    properties: {
      city: {
        type: "string",
        description: "City name (e.g. Beijing, Tokyo, Paris)",
      },
    },
    required: ["city"],
  },
  execute: async ({ city }) => {
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
});
