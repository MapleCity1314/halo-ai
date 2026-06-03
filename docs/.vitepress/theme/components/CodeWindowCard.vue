<script setup lang="ts">
interface Props {
  title?: string;
  lang?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="code-window-card">
    <div class="code-window-card__bar">
      <div class="code-window-card__dots">
        <span class="code-window-card__dot code-window-card__dot--red"></span>
        <span class="code-window-card__dot code-window-card__dot--yellow"></span>
        <span class="code-window-card__dot code-window-card__dot--green"></span>
      </div>
      <div v-if="title" class="code-window-card__title">
        {{ title }}
      </div>
      <div v-if="lang" class="code-window-card__lang">
        {{ lang }}
      </div>
    </div>
    
    <div class="code-window-card__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.code-window-card {
  background-color: var(--ds-surface-dark);
  border-radius: var(--ds-rounded-lg);
  border: 1px solid var(--ds-surface-dark-soft);
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 100%;
  box-sizing: border-box;
}

.code-window-card__bar {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background-color: var(--ds-surface-dark-elevated);
  border-bottom: 1px solid var(--ds-surface-dark-soft);
}

.code-window-card__dots {
  display: flex;
  gap: 8px;
}

.code-window-card__dot {
  width: 12px;
  height: 12px;
  border-radius: var(--ds-rounded-full);
}

.code-window-card__dot--red {
  background-color: #ef4444;
}

.code-window-card__dot--yellow {
  background-color: #f59e0b;
}

.code-window-card__dot--green {
  background-color: #22c55e;
}

.code-window-card__title {
  font-family: var(--ds-font-mono);
  font-size: 12px;
  color: var(--ds-on-dark-soft);
  margin-left: 20px;
  flex-grow: 1;
}

.code-window-card__lang {
  font-family: var(--ds-font-sans);
  font-size: 11px;
  color: var(--ds-on-dark-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.code-window-card__body {
  padding: 16px;
  overflow-x: auto;
}

:deep(.code-window-card__body pre) {
  margin: 0 !important;
  background-color: transparent !important;
  padding: 0 !important;
}

:deep(.code-window-card__body code) {
  font-family: var(--ds-font-mono) !important;
  font-size: var(--ds-code-size) !important;
  line-height: var(--ds-code-lineheight) !important;
  color: var(--ds-on-dark) !important;
}
</style>
