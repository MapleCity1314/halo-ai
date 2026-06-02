import type { TurnChunk, ToolCall, Usage } from "@halo-ai/core";

/**
 * Wraps an AsyncGenerator<TurnChunk> as an SSE Response.
 * Format compatible with Vercel AI SDK's 0:/d: protocol.
 */
export function toDataStream(
  source: AsyncGenerator<TurnChunk>,
  opts?: { headers?: Record<string, string> },
): Response {
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        for await (const chunk of source) {
          switch (chunk.type) {
            case "text-delta":
              controller.enqueue(encoder.encode(`0:${JSON.stringify(chunk.delta)}\n`));
              break;
            case "tool-call-delta":
              controller.enqueue(encoder.encode(`9:${JSON.stringify([chunk])}\n`));
              break;
            case "tool-call-ready":
              controller.enqueue(encoder.encode(`9:${JSON.stringify([chunk])}\n`));
              break;
            case "done":
              controller.enqueue(encoder.encode(`d:${JSON.stringify({ usage: chunk.usage })}\n`));
              break;
          }
        }
      } catch (err) {
        controller.error(err);
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      ...opts?.headers,
    },
  });
}

/**
 * Custom stream entry. Does not go through HaloAgent.
 */
export function createHaloStream(
  fn: (ctrl: {
    writeText: (delta: string) => void;
    writeToolCall: (call: ToolCall) => void;
    close: (usage?: Usage) => void;
    error: (err: Error) => void;
  }) => Promise<void>,
): ReadableStream {
  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      await fn({
        writeText(delta) {
          controller.enqueue(encoder.encode(delta));
        },
        writeToolCall(call) {
          controller.enqueue(encoder.encode(JSON.stringify(call)));
        },
        close(_usage) {
          controller.close();
        },
        error(err) {
          controller.error(err);
        },
      });
    },
  });
}
