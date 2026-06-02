import { toDataStream } from "@halo-ai/stream";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import type { ChatMessage } from "@halo-ai/core";

/**
 * POST /api/chat
 *
 * Receives UIMessages from `useChat()` (Vercel AI SDK format),
 * converts them to Halo ChatMessages, streams the response
 * via DeepSeek with prefix caching.
 */
export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: string; content: string }[];
  };

  // Convert useChat UIMessages to Halo ChatMessages.
  const chatMessages: ChatMessage[] = messages
    .filter((m) => m.role !== "system") // system prompt goes in prefix
    .map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    }));

  const adapter = new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  });

  // Cache-first: system prompt in stable prefix, conversation in dynamic history.
  const prefix: ChatMessage[] = [
    { role: "system", content: "You are a helpful assistant." },
  ];

  const stream = adapter.stream(prefix, chatMessages);
  return toDataStream(stream);
}

/*
 * ── Production pattern (stateful sessions) ──
 *
 * The demo above uses adapter.stream() directly for stateless simplicity.
 * For production with tool calling, keep-alive, and full cache tracking:
 *
 *   import { Halo } from "@halo-ai/core";
 *
 *   const halo = new Halo({ adapter });
 *   const session = halo.session({
 *     system: "You are a helpful assistant.",
 *     tools: { ... },
 *   });
 *
 *   const result = await session.run(userInput);
 *   // or for streaming: session.stream(userInput) + toDataStream()
 *
 *   console.log(session.stats.caching?.cacheHitRate);
 */
