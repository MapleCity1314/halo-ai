<script setup lang="ts">
interface Props {
  model: string;
  title: string;
}

defineProps<Props>();
</script>

<template>
  <div class="model-card">
    <span class="model-card__badge">{{ model }}</span>
    <h3 class="model-card__title">{{ title }}</h3>
    <div class="model-card__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.model-card {
  background-color: var(--ds-canvas);
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

.model-card:hover {
  border-color: var(--ds-primary);
  box-shadow: var(--vp-shadow-2);
}

.model-card__badge {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-caption-uppercase-size);
  font-weight: var(--ds-caption-uppercase-weight);
  line-height: var(--ds-caption-uppercase-lineheight);
  letter-spacing: var(--ds-caption-uppercase-spacing);
  color: var(--ds-primary);
  text-transform: uppercase;
  margin-bottom: var(--ds-space-xs);
}

.model-card__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-display-sm-size);
  font-weight: 400;
  color: var(--ds-ink);
  margin: 0 0 var(--ds-space-md) 0 !important;
  line-height: 1.2;
  letter-spacing: -0.3px;
}

.model-card__content {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-body-md-size);
  line-height: 1.6;
  color: var(--ds-body);
  width: 100%;
}

:deep(.model-card__content p) {
  margin: 0 0 var(--ds-space-sm) 0 !important;
}

:deep(.model-card__content p:last-child) {
  margin-bottom: 0 !important;
}

:deep(.model-card__content strong) {
  color: var(--ds-ink);
  font-weight: 500;
}
</style>
