import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Halo Chat",
  description: "Chat powered by Halo AI SDK + DeepSeek",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-950 text-gray-100 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
