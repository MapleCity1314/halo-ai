import { defineConfig } from "vitepress";

const sidebarEn = {
  "/en/introduction/": [
    { text: "Introduction", items: [
      { text: "Overview", link: "/en/introduction/overview" },
      { text: "Why Halo?", link: "/en/introduction/why-halo" },
      { text: "Architecture", link: "/en/introduction/architecture" },
    ]},
  ],
  "/en/getting-started/": [
    { text: "Getting Started", items: [
      { text: "Installation", link: "/en/getting-started/installation" },
      { text: "Quick Start", link: "/en/getting-started/quick-start" },
      { text: "Choosing a Provider", link: "/en/getting-started/choosing-a-provider" },
      { text: "Next.js App Router", link: "/en/getting-started/nextjs-app-router" },
      { text: "Next.js Pages Router", link: "/en/getting-started/nextjs-pages-router" },
      { text: "Node.js", link: "/en/getting-started/nodejs" },
    ]},
  ],
  "/en/core-concepts/": [
    { text: "Core Concepts", items: [
      { text: "Cache-First Design", link: "/en/core-concepts/cache-first" },
      { text: "Stable Prefix & Message Log", link: "/en/core-concepts/stable-prefix" },
      { text: "Agent Loop", link: "/en/core-concepts/agent-loop" },
      { text: "Streaming", link: "/en/core-concepts/streaming" },
      { text: "Cache Keep-Alive", link: "/en/core-concepts/keep-alive" },
      { text: "Provider Architecture", link: "/en/core-concepts/provider-architecture" },
      { text: "Message Lifecycle", link: "/en/core-concepts/message-lifecycle" },
      { text: "Error Handling", link: "/en/core-concepts/error-handling" },
      { text: "Cost Optimization", link: "/en/core-concepts/cost-optimization" },
    ]},
  ],
  "/en/guides/": [
    { text: "Guides", items: [
      { text: "Building an Agent", link: "/en/guides/building-an-agent" },
      { text: "Tool Calling", link: "/en/guides/tool-calling" },
      { text: "Multi-Provider Setup", link: "/en/guides/multi-provider" },
      { text: "Context Management", link: "/en/guides/context-management" },
      { text: "Repairing Tool Calls", link: "/en/guides/repairing-tool-calls" },
      { text: "Testing Agents", link: "/en/guides/testing" },
      { text: "Deploying to Production", link: "/en/guides/deploying" },
      { text: "Custom Adapter", link: "/en/guides/custom-adapter" },
    ]},
  ],
  "/en/api-reference/": [
    { text: "API Reference", items: [
      { text: "Halo", link: "/en/api-reference/halo" },
      { text: "HaloAgent", link: "/en/api-reference/halo-agent" },
      { text: "StablePrefix", link: "/en/api-reference/stable-prefix" },
      { text: "MessageLog", link: "/en/api-reference/message-log" },
      { text: "ModelAdapter", link: "/en/api-reference/model-adapter" },
      { text: "DeepSeekAdapter", link: "/en/api-reference/deepseek-adapter" },
      { text: "ContextStrategy", link: "/en/api-reference/context-strategy" },
      { text: "RepairStrategy", link: "/en/api-reference/repair-strategy" },
      { text: "toDataStream", link: "/en/api-reference/to-data-stream" },
      { text: "tool()", link: "/en/api-reference/tool" },
      { text: "Agent Events", link: "/en/api-reference/agent-events" },
      { text: "Types", link: "/en/api-reference/types" },
    ]},
  ],
  "/en/examples/": [
    { text: "Examples", items: [
      { text: "Next.js Chat", link: "/en/examples/next-halo" },
      { text: "Node.js CLI", link: "/en/examples/nodejs-cli" },
      { text: "Express Server", link: "/en/examples/express-server" },
    ]},
  ],
};

const sidebarZh = {
  "/zh/introduction/": [
    { text: "介绍", items: [
      { text: "概述", link: "/zh/introduction/overview" },
      { text: "为什么选择 Halo？", link: "/zh/introduction/why-halo" },
      { text: "架构", link: "/zh/introduction/architecture" },
    ]},
  ],
  "/zh/getting-started/": [
    { text: "快速开始", items: [
      { text: "安装", link: "/zh/getting-started/installation" },
      { text: "5 分钟上手", link: "/zh/getting-started/quick-start" },
      { text: "选择提供商", link: "/zh/getting-started/choosing-a-provider" },
      { text: "Next.js App Router", link: "/zh/getting-started/nextjs-app-router" },
      { text: "Next.js Pages Router", link: "/zh/getting-started/nextjs-pages-router" },
      { text: "Node.js", link: "/zh/getting-started/nodejs" },
    ]},
  ],
  "/zh/core-concepts/": [
    { text: "核心概念", items: [
      { text: "Cache-First 设计", link: "/zh/core-concepts/cache-first" },
      { text: "稳定前缀与消息日志", link: "/zh/core-concepts/stable-prefix" },
      { text: "Agent 循环", link: "/zh/core-concepts/agent-loop" },
      { text: "流式输出", link: "/zh/core-concepts/streaming" },
      { text: "缓存保活", link: "/zh/core-concepts/keep-alive" },
      { text: "提供商架构", link: "/zh/core-concepts/provider-architecture" },
      { text: "消息生命周期", link: "/zh/core-concepts/message-lifecycle" },
      { text: "错误处理", link: "/zh/core-concepts/error-handling" },
      { text: "成本优化", link: "/zh/core-concepts/cost-optimization" },
    ]},
  ],
  "/zh/guides/": [
    { text: "指南", items: [
      { text: "构建一个 Agent", link: "/zh/guides/building-an-agent" },
      { text: "工具调用", link: "/zh/guides/tool-calling" },
      { text: "多提供商设置", link: "/zh/guides/multi-provider" },
      { text: "上下文管理", link: "/zh/guides/context-management" },
      { text: "修复工具调用", link: "/zh/guides/repairing-tool-calls" },
      { text: "测试 Agent", link: "/zh/guides/testing" },
      { text: "部署到生产环境", link: "/zh/guides/deploying" },
      { text: "自定义适配器", link: "/zh/guides/custom-adapter" },
    ]},
  ],
  "/zh/api-reference/": [
    { text: "API 参考", items: [
      { text: "Halo", link: "/zh/api-reference/halo" },
      { text: "HaloAgent", link: "/zh/api-reference/halo-agent" },
      { text: "StablePrefix", link: "/zh/api-reference/stable-prefix" },
      { text: "MessageLog", link: "/zh/api-reference/message-log" },
      { text: "ModelAdapter", link: "/zh/api-reference/model-adapter" },
      { text: "DeepSeekAdapter", link: "/zh/api-reference/deepseek-adapter" },
      { text: "ContextStrategy", link: "/zh/api-reference/context-strategy" },
      { text: "RepairStrategy", link: "/zh/api-reference/repair-strategy" },
      { text: "toDataStream", link: "/zh/api-reference/to-data-stream" },
      { text: "tool()", link: "/zh/api-reference/tool" },
      { text: "Agent 事件", link: "/zh/api-reference/agent-events" },
      { text: "类型", link: "/zh/api-reference/types" },
    ]},
  ],
  "/zh/examples/": [
    { text: "示例", items: [
      { text: "Next.js 聊天", link: "/zh/examples/next-halo" },
      { text: "Node.js CLI", link: "/zh/examples/nodejs-cli" },
      { text: "Express 服务器", link: "/zh/examples/express-server" },
    ]},
  ],
};

export default defineConfig({
  title: "Halo AI SDK",
  description: "Cache-First Agent Framework",
  ignoreDeadLinks: true,

  locales: {
    root: {
      label: "简体中文",
      lang: "zh-CN",
      title: "Halo AI SDK",
      description: "Cache-First 智能体框架 — 自动前缀缓存，多模型支持",
      themeConfig: {
        nav: [
          { text: "指南", link: "/zh/introduction/overview" },
          { text: "API", link: "/zh/api-reference/halo" },
          { text: "示例", link: "/zh/examples/next-halo" },
        ],
        sidebar: { ...sidebarZh },
        socialLinks: [{ icon: "github", link: "https://github.com" }],
        footer: { message: "基于 MIT 许可证发布" },
        search: { provider: "local" },
      },
    },
    en: {
      label: "English",
      lang: "en-US",
      title: "Halo AI SDK",
      description: "Cache-First Agent Framework — Build AI agents with automatic prefix caching.",
      themeConfig: {
        nav: [
          { text: "Guide", link: "/en/introduction/overview" },
          { text: "API", link: "/en/api-reference/halo" },
          { text: "Examples", link: "/en/examples/next-halo" },
        ],
        sidebar: { ...sidebarEn },
        socialLinks: [{ icon: "github", link: "https://github.com" }],
        footer: { message: "Released under the MIT License." },
        search: { provider: "local" },
      },
    },
  },

  markdown: {
    theme: { light: "github-light", dark: "github-dark" },
  },
});
