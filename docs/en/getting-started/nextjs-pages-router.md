# Next.js Pages Router

Use Halo with Next.js Pages Router.

## API Route

Create `pages/api/chat.ts`:

```ts
import { Halo } from "@halo-ai/core";
import { DeepSeekAdapter } from "@halo-ai/adapters";
import { toDataStream } from "@halo-ai/stream";
import type { NextApiRequest, NextApiResponse } from "next";

const halo = new Halo({
  adapter: new DeepSeekAdapter({
    apiKey: process.env.DEEPSEEK_API_KEY!,
  }),
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { messages } = req.body;
  const agent = halo.agent({
    system: "You are a helpful assistant.",
  });
  // toDataStream returns a Response — convert for Pages Router
  const response = toDataStream(agent.sdkStream(messages));
  res.writeHead(200, Object.fromEntries(response.headers));
  const reader = response.body?.getReader();
  if (!reader) return res.end();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    res.write(value);
  }
  res.end();
}
```

## Client Component

Same `useChat` usage as App Router:

```tsx
import { useChat } from "@ai-sdk/react";
// ... identical to App Router chat component
```
