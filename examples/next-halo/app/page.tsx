import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main className="flex flex-col h-screen max-w-3xl mx-auto p-4">
      <header className="py-4 border-b border-gray-800 mb-4">
        <h1 className="text-xl font-bold">Halo Chat</h1>
        <p className="text-sm text-gray-400">
          Powered by Halo AI SDK &middot; DeepSeek
        </p>
      </header>
      <Chat />
    </main>
  );
}
