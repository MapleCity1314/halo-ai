<script setup lang="ts">
interface Props {
  title: string;
  subtitle: string;
}

defineProps<Props>();
</script>

<template>
  <div class="ds-hero-band">
    <div class="ds-hero-band__content">
      <h1 class="ds-hero-band__title">{{ title }}</h1>
      <p class="ds-hero-band__subtitle">{{ subtitle }}</p>
      
      <div v-if="$slots.actions" class="ds-hero-band__actions">
        <slot name="actions" />
      </div>
      
      <slot />
    </div>
    
    <div v-if="$slots.media" class="ds-hero-band__media">
      <slot name="media" />
    </div>
  </div>
</template>

<style scoped>
.ds-hero-band {
  display: grid;
  grid-template-columns: 1.1fr 0.9fr;
  gap: var(--ds-space-xxl);
  align-items: center;
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--ds-space-section) var(--ds-space-xl);
  box-sizing: border-box;
}

.ds-hero-band__content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.ds-hero-band__title {
  font-family: var(--ds-font-display);
  font-size: var(--ds-display-xl-size);
  font-weight: var(--ds-display-xl-weight);
  line-height: var(--ds-display-xl-lineheight);
  letter-spacing: var(--ds-display-xl-spacing);
  color: var(--ds-ink);
  margin: 0 0 var(--ds-space-sm) 0;
  text-align: left;
}

.ds-hero-band__subtitle {
  font-family: var(--ds-font-sans);
  font-size: var(--ds-title-lg-size);
  line-height: 1.5;
  color: var(--ds-body);
  margin: 0 0 var(--ds-space-xl) 0;
  text-align: left;
}

.ds-hero-band__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ds-space-sm);
  margin-bottom: var(--ds-space-md);
}

.ds-hero-band__media {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
}

@media (max-width: 960px) {
  .ds-hero-band {
    grid-template-columns: 1fr;
    padding: var(--ds-space-xxl) var(--ds-space-xl);
    gap: var(--ds-space-xl);
  }
  
  .ds-hero-band__title {
    font-size: 40px;
    letter-spacing: -1px;
  }
  
  .ds-hero-band__subtitle {
    font-size: 18px;
  }
}

@media (max-width: 640px) {
  .ds-hero-band {
    padding: var(--ds-space-xl) var(--ds-space-md);
  }
  
  .ds-hero-band__title {
    font-size: 32px;
  }
}
</style>
