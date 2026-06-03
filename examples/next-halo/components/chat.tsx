"use client";

import { useChat } from "@ai-sdk/react";

export function Chat() {
  const { messages, input, handleInputChange, handleSubmit, status, error } =
    useChat();

  return (
    <div className="flex flex-col flex-1 gap-4">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((m) => (
          <div key={m.id} className="space-y-2">
            {/* Tool invocations */}
            {m.parts?.map((part, i) => {
              if (part.type !== "tool-invocation") return null;
              const ti = part.toolInvocation;
              return (
                <div key={i} className="flex justify-start">
                  <div
                    className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${
                      ti.state === "result"
                        ? "bg-green-900/30 text-green-300 border border-green-800"
                        : "bg-yellow-900/30 text-yellow-300 border border-yellow-800 animate-pulse"
                    }`}
                  >
                    <span className="font-mono text-xs opacity-70">
                      {ti.state === "result" ? "✓" : "⚡"}{" "}
                    </span>
                    <span className="font-medium">{ti.toolName}</span>
                    {ti.state === "result" && (
                      <span className="ml-2 opacity-80">
                        {typeof ti.result === "string"
                          ? ti.result
                          : JSON.stringify(ti.result)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Text content */}
            {m.content && (
              <div
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white"
                      : "bg-gray-800 text-gray-100"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}

        {status === "submitted" && (
          <div className="flex justify-start">
            <div className="bg-gray-800 rounded-xl px-4 py-3 text-sm text-gray-400">
              Thinking...
            </div>
          </div>
        )}

        {error && (
          <div className="flex justify-center">
            <div className="bg-red-900/50 text-red-300 rounded-xl px-4 py-3 text-sm">
              {error.message}
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2 pb-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask about weather, e.g. What's the weather in Tokyo?"
          disabled={status === "submitted" || status === "streaming"}
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm
                     text-gray-100 placeholder-gray-500
                     focus:outline-none focus:ring-2 focus:ring-blue-500
                     disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={
            status === "submitted" || status === "streaming" || !input.trim()
          }
          className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500
                     text-white rounded-xl px-5 py-3 text-sm font-medium
                     transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}
