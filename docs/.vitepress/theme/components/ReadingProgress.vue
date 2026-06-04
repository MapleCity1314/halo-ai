<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

const progress = ref(0);
const visible = ref(false);

let ticking = false;

function updateProgress() {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;
  if (docHeight <= 0) {
    progress.value = 0;
    visible.value = false;
    return;
  }
  const pct = Math.min((scrollTop / docHeight) * 100, 100);
  progress.value = pct;
  visible.value = scrollTop > 100;
}

function onScroll() {
  if (!ticking) {
    requestAnimationFrame(() => {
      updateProgress();
      ticking = false;
    });
    ticking = true;
  }
}

onMounted(() => {
  updateProgress();
  window.addEventListener("scroll", onScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <div class="reading-progress" :class="{ visible }">
    <div class="reading-progress__bar" :style="{ width: `${progress}%` }"></div>
  </div>
</template>

<style scoped>
.reading-progress {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  z-index: 1001;
  background: transparent;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.reading-progress.visible {
  opacity: 1;
}

.reading-progress__bar {
  height: 100%;
  background: linear-gradient(90deg, var(--ds-primary), var(--ds-accent-teal));
  width: 0;
  border-radius: 0 2px 2px 0;
  transition: width 0.15s ease-out;
}
</style>
