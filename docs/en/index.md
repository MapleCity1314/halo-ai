---
layout: page
aside: false
---

<div class="home-page-container">

<HeroBand title="Halo AI SDK" subtitle="The first Cache-First LLM Agent Framework">
<template #actions>
<DsButton href="/en/getting-started/installation" variant="primary">Get Started</DsButton>
<DsButton href="/en/introduction/overview" variant="secondary">Read Guides</DsButton>
</template>
<template #media>
<CodeWindowCard lang="typescript" title="src/index.ts" style="width: 100%; max-width: 540px;">

```typescript
// 🧠 Initialize Cache-First Agentic Loop
import { Halo, StablePrefix } from '@halo-ai/core'
import { deepseek } from '@halo-ai/adapters'

const halo = new Halo({
  model: deepseek('deepseek-chat'),
  prefix: new StablePrefix({
    system: 'You are a highly accurate codebase analysis assistant.',
    tools: { getCodeContext, searchFiles }
  })
})

const stream = await halo.run({
  prompt: 'Optimize this algorithm and find best practices...',
  // Automatic prefix caching for instant responses in multi-turn chat
  cache: 'first'
})
```

</CodeWindowCard>
</template>
</HeroBand>

<!-- Features Grid Section -->
<div class="home-features">
  <FeatureCard icon="⚡" title="Dynamic Prefix Caching">Automatically recognize and lock prompt prefixes, eliminating duplicate Token computation. Reduce costs by up to <strong>90%</strong> and first-token latency by <strong>80%</strong> in multi-turn conversations.</FeatureCard>
  <FeatureCard icon="🛠️" title="Multi-Model Adapters">Out-of-the-box support for <strong>DeepSeek</strong>, OpenAI, and Anthropic. Standardize differences in provider-level caching under a unified high-level API.</FeatureCard>
  <FeatureCard icon="🩹" title="Self-Repairing Tools">Built-in smart strategies automatically catch and fix invalid JSON or missing parameters from model outputs, guaranteeing loop resilience.</FeatureCard>
  <FeatureCard icon="🌊" title="Real-Time Streaming">Full-stream event pipeline feeds Agent thinking traces, decision logs, and tool execution state to your frontend application.</FeatureCard>
</div>

<!-- High Contrast Mockup Comparison Section -->
<div class="home-section">
  <div class="contrast-card-container">
    <div class="contrast-header">
      <h2>⚡ From API Wrapper to Production-Ready Agent Architecture</h2>
      <p style="margin: 0;">Traditional frameworks only concatenate Prompts. Halo is built from the ground up to solve latency and cost pain points in enterprise-scale agent loops.</p>
    </div>
    <div class="comparison-grid">
      <div class="contrast-column contrast-column--ordinary">
        <h3>❌ Ordinary API Frameworks</h3>
        <ul class="contrast-list">
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>Expensive Token Cost</strong>: Historical contexts accumulate linearly, forcing the model to re-evaluate all tokens on every turn.</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>Unpredictable Latency</strong>: As Context Windows grow, model inference queues and processing times stretch exponentially.</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>Fragile Execution</strong>: Crashes immediately when encountering minor model output formatting errors without any self-healing.</span>
          </li>
        </ul>
      </div>
      <div class="contrast-column contrast-column--agentic">
        <h3>✨ Halo AI Core Primitives</h3>
        <ul class="contrast-list">
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>Prefix Locking & Fast Caching</strong>: Stable prefixes (system prompts, tool definitions) stay cached for near-zero latency responses.</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>Precision Context De-noising</strong>: Integrated truncation policies maintain clean context sizes, shedding irrelevant history.</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>Self-Healing Pipelines</strong>: Intercept and repair invalid tool call arguments dynamically to preserve execution integrity.</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- Project Showcase Section -->
<div class="home-section">
  <h2 class="home-section-title">📦 Modular Package Design</h2>
  <p class="home-section-subtitle">Halo follows the Unix philosophy, separating agent complexity into distinct, high-cohesion packages</p>
  <div class="project-grid">
    <ModelComparisonCard model="packages/core" title="@halo-ai/core">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">Core Agent Engine</p>
      Manages the main Agent execution loop, context lifecycles, stable prefixes, and event stream lifecycles.
    </ModelComparisonCard>
    <ModelComparisonCard model="packages/adapters" title="@halo-ai/adapters">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">Multi-Provider Adapters</p>
      Provides native bindings for DeepSeek, OpenAI, and Anthropic, mapping raw API models to standard Cache-First interfaces.
    </ModelComparisonCard>
    <ModelComparisonCard model="packages/strategies" title="@halo-ai/strategies">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">Resilience Strategies</p>
      Provides truncation policies (Truncate Strategy) and tool calling self-healing rules (Basic Repair Strategy) to prevent loops from failing.
    </ModelComparisonCard>
  </div>
</div>

<!-- Pre-footer CTA Section -->
<div class="home-section" style="padding-bottom: 96px;">
  <CtaBand title="Ready to build high-performance agents?" variant="dark" ctaLabel="Start My Journey" ctaHref="/en/getting-started/installation">
    Say goodbye to slow response times and heavy token bills. Start building cache-first agent systems optimized for production today.
  </CtaBand>
</div>

</div>
