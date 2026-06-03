---
layout: page
aside: false
---

<div class="home-page-container">

<HeroBand title="Halo AI SDK" subtitle="首个 Cache-First 的大模型智能体开发框架">
<template #actions>
<DsButton href="/zh/getting-started/installation" variant="primary">快速开始</DsButton>
<DsButton href="/zh/introduction/overview" variant="secondary">阅读指南</DsButton>
</template>
<template #media>
<CodeWindowCard lang="typescript" title="src/index.ts" style="width: 100%; max-width: 540px;">

```typescript
// 🧠 开启 Cache-First 的 Agentic Loop
import { Halo, StablePrefix } from '@halo-ai/core'
import { deepseek } from '@halo-ai/adapters'

const halo = new Halo({
  model: deepseek('deepseek-chat'),
  prefix: new StablePrefix({
    system: '你是一个高精度的代码库分析助理。',
    tools: { getCodeContext, searchFiles }
  })
})

const stream = await halo.run({
  prompt: '优化这段算法并搜索最佳实践...',
  // 自动前缀缓存，多轮对话近乎瞬时响应
  cache: 'first'
})
```

</CodeWindowCard>
</template>
</HeroBand>

<!-- Features Grid Section -->
<div class="home-features">
  <FeatureCard icon="⚡" title="动态前缀缓存">自动识别并锁定 Prompt 前缀，减少重复 Token 消耗。在多轮对话中最高降本 <strong>90%</strong>，首字延迟降低 <strong>80%</strong>。</FeatureCard>
  <FeatureCard icon="🛠️" title="多模型适配层">内置对 <strong>DeepSeek</strong>、OpenAI、Anthropic 等主流提供商的完美支持，屏蔽底层缓存差异，提供统一的高层 API 接口。</FeatureCard>
  <FeatureCard icon="🩹" title="自愈式工具调用">内置智能修复策略，自动捕获并修正模型生成的无效 JSON 或缺失参数，确保复杂代理链路的绝对稳健。</FeatureCard>
  <FeatureCard icon="🌊" title="极速流式传输">提供全链路流式事件传输，实时将 Agent 思考状态、决策轨迹与工具执行日志推送至前端应用。</FeatureCard>
</div>

<!-- High Contrast Mockup Comparison Section -->
<div class="home-section">
  <div class="contrast-card-container">
    <div class="contrast-header">
      <h2>⚡ 从 API 调用仔到生产级智能体架构</h2>
      <p style="margin: 0;">普通的开发框架只负责拼接 Prompt，但 Halo 专为解决企业级 Agentic 循环的延迟与成本痛点而生。</p>
    </div>
    <div class="comparison-grid">
      <div class="contrast-column contrast-column--ordinary">
        <h3>❌ 普通 API 框架</h3>
        <ul class="contrast-list">
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>高昂的 Token 费用</strong>：多轮对话中历史上下文线性累加，每次交互均需重新计算全部 Token。</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>不可控的响应延迟</strong>：随着 Context Window 的膨胀，模型推理的排队与生成时间急剧增长。</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: #e65100;">⚠️</span>
            <span><strong>脆弱的工具链</strong>：遇到模型偶发性输出格式破损时直接崩溃，无法进行自动重试与参数修复。</span>
          </li>
        </ul>
      </div>
      <div class="contrast-column contrast-column--agentic">
        <h3>✨ Halo AI 核心原语</h3>
        <ul class="contrast-list">
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>前缀锁定与极速缓存</strong>：稳定前缀（系统提示词、工具定义、上下文）驻留缓存，二次响应近乎零延迟。</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>上下文精准去噪</strong>：内置 Truncate 等多种上下文截断策略，自动维持最精炼的记忆窗口。</span>
          </li>
          <li>
            <span class="contrast-bullet" style="color: var(--ds-accent-teal);">✅</span>
            <span><strong>自愈式执行管道</strong>：捕获工具参数缺陷并反向修复，保证复杂生产链路的高可用性与健壮度。</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</div>

<!-- Project Showcase Section -->
<div class="home-section">
  <h2 class="home-section-title">📦 模块化的工程包设计</h2>
  <p class="home-section-subtitle">Halo 遵循 Unix 哲学，将复杂的 Agent 架构拆解为高内聚、低耦合的核心模块</p>
  <div class="project-grid">
    <ModelComparisonCard model="packages/core" title="@halo-ai/core">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">智能体核心引擎</p>
      管理智能体主循环、上下文生命周期与稳定前缀（Stable Prefix），提供流式输出原语与底层状态机控制。
    </ModelComparisonCard>
    <ModelComparisonCard model="packages/adapters" title="@halo-ai/adapters">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">多提供商适配层</p>
      开箱即用支持 DeepSeek、OpenAI、Anthropic 等主流提供商，自动将底层 API 的 Prefix Cache 细节转化为统一格式。
    </ModelComparisonCard>
    <ModelComparisonCard model="packages/strategies" title="@halo-ai/strategies">
      <p style="margin: 0 0 8px; font-size: 13px; color: var(--ds-muted); font-weight: 500;">策略管理与自愈</p>
      内置上下文截断策略（Truncate Strategy）与工具调用基础自愈策略（Basic Repair Strategy），拦截执行异常并自愈.
    </ModelComparisonCard>
  </div>
</div>

<!-- Pre-footer CTA Section -->
<div class="home-section" style="padding-bottom: 96px;">
  <CtaBand title="准备好体验极速响应的智能体了吗？" variant="dark" ctaLabel="开启我的开发之旅" ctaHref="/zh/getting-started/installation">
    拒绝高昂的 Token 账单与漫长等待。立刻构建属于您的高性能 Cache-First 智能体系统，通往生产就绪的 LLM 应用时代。
  </CtaBand>
</div>

</div>
