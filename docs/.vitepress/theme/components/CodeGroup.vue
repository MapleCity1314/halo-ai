<script setup lang="ts">
interface Props {
  title?: string;
  filename?: string;
  lang?: string;
}

defineProps<Props>();
</script>

<template>
  <div class="ds-code-group">
    <div class="ds-code-group__header">
      <div class="ds-code-group__dots">
        <span class="ds-code-group__dot ds-code-group__dot--red"></span>
        <span class="ds-code-group__dot ds-code-group__dot--yellow"></span>
        <span class="ds-code-group__dot ds-code-group__dot--green"></span>
      </div>
      <span v-if="filename" class="ds-code-group__filename">{{ filename }}</span>
      <span v-if="lang" class="ds-code-group__lang">{{ lang }}</span>
    </div>
    <div class="ds-code-group__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ds-code-group {
  border: 1px solid var(--ds-hairline);
  border-radius: var(--ds-rounded-md);
  overflow: hidden;
  margin: 1.6em 0;
}

.ds-code-group__header {
  display: flex;
  align-items: center;
  padding: 10px 16px;
  background: var(--ds-surface-soft);
  border-bottom: 1px solid var(--ds-hairline);
  gap: 8px;
}

.ds-code-group__dots {
  display: flex;
  gap: 6px;
}

.ds-code-group__dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.ds-code-group__dot--red { background: #ef4444; }
.ds-code-group__dot--yellow { background: #f59e0b; }
.ds-code-group__dot--green { background: #22c55e; }

.ds-code-group__filename {
  font-family: var(--ds-font-mono);
  font-size: 12px;
  color: var(--ds-muted);
  margin-left: 8px;
}

.ds-code-group__lang {
  font-family: var(--ds-font-sans);
  font-size: 11px;
  color: var(--ds-muted-soft);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-left: auto;
}

.ds-code-group__body {
  padding: 0;
}

:deep(.ds-code-group__body div[class*="language-"]) {
  margin: 0 !important;
  border-radius: 0;
}

:deep(.ds-code-group__body pre) {
  margin: 0 !important;
  border-radius: 0;
}
</style>
