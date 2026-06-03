<script setup lang="ts">
interface Props {
  href: string;
  variant?: 'primary' | 'secondary';
}

withDefaults(defineProps<Props>(), {
  variant: 'primary',
});
</script>

<template>
  <a :href="href" :class="['ds-btn', `ds-btn--${variant}`]">
    <slot />
  </a>
</template>

<style scoped>
.ds-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ds-font-sans);
  font-size: var(--ds-button-size);
  font-weight: var(--ds-button-weight);
  line-height: var(--ds-button-lineheight);
  padding: 12px 22px;
  height: 40px;
  border-radius: var(--ds-rounded-md);
  text-decoration: none !important;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.ds-btn--primary {
  background-color: var(--ds-primary);
  color: var(--ds-on-primary) !important;
}

.ds-btn--primary:hover {
  background-color: var(--ds-primary-active);
}

.ds-btn--secondary {
  background-color: var(--ds-canvas);
  color: var(--ds-ink) !important;
  border: 1px solid var(--ds-hairline);
}

.ds-btn--secondary:hover {
  background-color: var(--ds-surface-soft);
}
</style>
