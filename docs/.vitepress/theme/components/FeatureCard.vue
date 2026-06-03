<script setup lang="ts">
interface Props {
  icon?: string;
  title: string;
}

defineProps<Props>();
</script>

<template>
  <div class="feature-card">
    <div v-if="icon" class="feature-card__icon">
      {{ icon }}
    </div>
    <h3 class="feature-card__title">{{ title }}</h3>
    <div class="feature-card__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.feature-card {
  background-color: var(--ds-surface-card);
  border: 1px solid var(--ds-hairline);
  border-radius: var(--ds-rounded-lg);
  padding: var(--ds-space-xl);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  text-align: left;
}

.feature-card:hover {
  border-color: var(--ds-primary);
  box-shadow: var(--vp-shadow-2);
}

.feature-card__icon {
  font-size: 28px;
  margin-bottom: var(--ds-space-sm);
  line-height: 1;
}

.feature-card__title {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-title-md-size);
  font-weight: 500;
  color: var(--ds-ink);
  margin: 0 0 var(--ds-space-xs) 0 !important;
  line-height: 1.4;
}

.feature-card__content {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-body-sm-size);
  line-height: 1.6;
  color: var(--ds-body);
}

:deep(.feature-card__content strong) {
  color: var(--ds-ink);
  font-weight: 500;
}
</style>
