# Transport Configuration Examples

## stdio: Local Filesystem Server

```ts
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-filesystem", "/home/user/projects"],
    env: {
      PATH: process.env.PATH,
      HOME: process.env.HOME,
    },
    cwd: "/home/user/projects",
  },
});
```

## stdio: Puppeteer (Web Search + Scrape)

```ts
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "npx",
    args: ["-y", "@anthropic/mcp-server-puppeteer"],
    env: {
      PUPPETEER_HEADLESS: "true",
      PUPPETEER_EXECUTABLE_PATH: "/usr/bin/chromium",
    },
  },
});
```

## stdio: Custom Python MCP Server

```ts
const server = await createMCPServer({
  transport: {
    type: "stdio",
    command: "python",
    args: ["-m", "my_mcp_server", "--port", "8080"],
    cwd: "/path/to/python/project",
  },
});
```

## SSE: Remote Server

```ts
const server = await createMCPServer({
  transport: {
    type: "sse",
    url: "https://mcp.internal.example.com/sse",
    headers: {
      Authorization: `Bearer ${process.env.MCP_TOKEN}`,
      "X-Client-Version": "1.0",
    },
  },
});
```

## SSE: Localhost (for testing)

```ts
const server = await createMCPServer({
  transport: {
    type: "sse",
    url: "http://localhost:3001/sse",
  },
});
```

## Multi-Server Agent with Cleanup

```ts
async function createResearchAgent() {
  const webServer = await createMCPServer({
    transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-puppeteer"] },
  });
  const fsServer = await createMCPServer({
    transport: { type: "stdio", command: "npx", args: ["-y", "@anthropic/mcp-server-filesystem", "/tmp/research"] },
  });

  const [webTools, fsTools] = await Promise.all([
    webServer.tools(),
    fsServer.tools(),
  ]);

  const agent = halo.agent({
    messages: [{ role: "system", content: "Research assistant with web and file access." }],
    tools: { ...webTools, ...fsTools },
  });

  return {
    agent,
    dispose: async () => {
      await webServer.close();
      await fsServer.close();
    },
  };
}
```
