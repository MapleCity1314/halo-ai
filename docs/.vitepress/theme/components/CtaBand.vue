<script setup lang="ts">
interface Props {
  title: string;
  variant?: 'dark' | 'coral';
  ctaLabel: string;
  ctaHref: string;
}

withDefaults(defineProps<Props>(), {
  variant: 'dark',
});
</script>

<template>
  <div :class="['cta-band', `cta-band--${variant}`]">
    <h2 class="cta-band__title">{{ title }}</h2>
    <p class="cta-band__desc">
      <slot />
    </p>
    <div class="cta-band__actions">
      <a :href="ctaHref" :class="['cta-band__btn', `cta-band__btn--${variant}`]">
        {{ ctaLabel }}
      </a>
    </div>
  </div>
</template>

<style scoped>
.cta-band {
  border-radius: var(--ds-rounded-lg);
  padding: 64px 32px;
  text-align: center;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  max-width: 1200px;
  margin: 0 auto;
}

.cta-band__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-display-sm-size);
  font-weight: 400;
  margin: 0 0 var(--ds-space-sm) 0 !important;
  line-height: 1.2;
}

.cta-band--dark {
  background-color: var(--ds-surface-dark);
  border: 1px solid var(--ds-surface-dark-soft);
}

.cta-band--dark .cta-band__title {
  color: var(--ds-on-dark) !important;
}

.cta-band--coral {
  background-color: var(--ds-primary);
}

.cta-band--coral .cta-band__title {
  color: var(--ds-on-primary) !important;
}

.cta-band__desc {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-body-md-size);
  line-height: 1.6;
  max-width: 640px;
  margin: 0 0 var(--ds-space-xl) 0 !important;
}

.cta-band--dark .cta-band__desc {
  color: var(--ds-on-dark-soft);
}

.cta-band--coral .cta-band__desc {
  color: rgba(255, 255, 255, 0.9);
}

.cta-band__actions {
  display: flex;
  justify-content: center;
}

.cta-band__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: var(--ds-font-sans);
  font-size: var(--ds-button-size);
  font-weight: var(--ds-button-weight);
  padding: 12px 28px;
  height: 44px;
  border-radius: var(--ds-rounded-md);
  text-decoration: none !important;
  transition: all 0.15s ease;
  box-sizing: border-box;
}

.cta-band__btn--dark {
  background-color: var(--ds-primary);
  color: var(--ds-on-primary) !important;
}

.cta-band__btn--dark:hover {
  background-color: var(--ds-primary-active);
}

.cta-band__btn--coral {
  background-color: var(--ds-canvas);
  color: var(--ds-ink) !important;
  border: 1px solid var(--ds-hairline);
}

.cta-band__btn--coral:hover {
  background-color: var(--ds-surface-soft);
}

@media (max-width: 640px) {
  .cta-band {
    padding: 48px var(--ds-space-md);
  }
  
  .cta-band__title {
    font-size: 24px;
  }
}
</style>
