import { toDataStream } from "@halo-ai/stream";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { Halo } from "@halo-ai/core";
import type { ChatMessage } from "@halo-ai/core";

const adapter = new DeepSeekAdapter({
  apiKey: process.env.DEEPSEEK_API_KEY!,
});

const halo = new Halo({ adapter });

/**
 * POST /api/chat
 *
 * Receives UIMessages from `useChat()` (Vercel AI SDK format),
 * hydrates a HaloAgent with prior history, streams the response.
 */
export async function POST(req: Request) {
  const { messages } = (await req.json()) as {
    messages: { role: string; content: string }[];
  };

  // Convert useChat UIMessages to Halo ChatMessages.
  const chatMessages: ChatMessage[] = messages
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: m.role as ChatMessage["role"],
      content: m.content,
    }));

  // The last message is the new user input — everything before it is history.
  const lastMessage = chatMessages.pop()!;
  const priorMessages = chatMessages;

  const agent = halo.agent({
    system: "You are a helpful assistant.",
  });

  // Hydrate prior conversation so the agent has full context.
  if (priorMessages.length > 0) {
    agent.hydrate(priorMessages);
  }

  const stream = agent.stream(lastMessage.content);
  return toDataStream(stream);
}
