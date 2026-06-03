import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Halo AI SDK",
  description:
    "Cache-First Agent Framework — build AI agents with automatic prefix caching across multiple model providers.",
  lang: "en-US",

  themeConfig: {
    nav: [
      { text: "Guide", link: "/introduction/overview" },
      { text: "API Reference", link: "/api-reference/halo" },
      { text: "Examples", link: "/examples/next-halo" },
    ],

    sidebar: {
      "/introduction/": [
        {
          text: "Introduction",
          items: [
            { text: "Overview", link: "/introduction/overview" },
            { text: "Architecture", link: "/introduction/architecture" },
          ],
        },
      ],
      "/getting-started/": [
        {
          text: "Getting Started",
          items: [
            { text: "Installation", link: "/getting-started/installation" },
            {
              text: "Choosing a Provider",
              link: "/getting-started/choosing-a-provider",
            },
            {
              text: "Next.js App Router",
              link: "/getting-started/nextjs-app-router",
            },
            {
              text: "Next.js Pages Router",
              link: "/getting-started/nextjs-pages-router",
            },
            { text: "Node.js", link: "/getting-started/nodejs" },
          ],
        },
      ],
      "/core-concepts/": [
        {
          text: "Core Concepts",
          items: [
            {
              text: "Cache-First Design",
              link: "/core-concepts/cache-first",
            },
            {
              text: "Stable Prefix & Message Log",
              link: "/core-concepts/stable-prefix",
            },
            { text: "Agent Loop", link: "/core-concepts/agent-loop" },
            { text: "Streaming", link: "/core-concepts/streaming" },
            { text: "Cache Keep-Alive", link: "/core-concepts/keep-alive" },
            {
              text: "Provider Architecture",
              link: "/core-concepts/provider-architecture",
            },
          ],
        },
      ],
      "/guides/": [
        {
          text: "Guides",
          items: [
            {
              text: "Building an Agent",
              link: "/guides/building-an-agent",
            },
            { text: "Tool Calling", link: "/guides/tool-calling" },
            { text: "Multi-Provider Setup", link: "/guides/multi-provider" },
            {
              text: "Context Management",
              link: "/guides/context-management",
            },
            {
              text: "Repairing Tool Calls",
              link: "/guides/repairing-tool-calls",
            },
          ],
        },
      ],
      "/api-reference/": [
        {
          text: "API Reference",
          items: [
            { text: "Halo", link: "/api-reference/halo" },
            { text: "HaloAgent", link: "/api-reference/halo-agent" },
            { text: "StablePrefix", link: "/api-reference/stable-prefix" },
            { text: "MessageLog", link: "/api-reference/message-log" },
            { text: "ModelAdapter", link: "/api-reference/model-adapter" },
            {
              text: "DeepSeekAdapter",
              link: "/api-reference/deepseek-adapter",
            },
            {
              text: "ContextStrategy",
              link: "/api-reference/context-strategy",
            },
            {
              text: "RepairStrategy",
              link: "/api-reference/repair-strategy",
            },
            { text: "toDataStream", link: "/api-reference/to-data-stream" },
            { text: "Types", link: "/api-reference/types" },
          ],
        },
      ],
      "/examples/": [
        {
          text: "Examples",
          items: [
            { text: "Next.js Chat", link: "/examples/next-halo" },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: "github", link: "https://github.com" },
    ],

    search: {
      provider: "local",
    },

    footer: {
      message: "Released under the MIT License.",
    },
  },

  ignoreDeadLinks: ["http://localhost:3000"],

  markdown: {
    theme: {
      light: "github-light",
      dark: "github-dark",
    },
  },
});
