<script setup lang="ts">
import { inject, computed, onMounted } from "vue";

interface Props {
  id: string;
  label: string;
}

const props = defineProps<Props>();

const tabs = inject<{
  activeTab: { value: string };
  registerTab: (id: string, label: string) => void;
}>("tabs");

const isActive = computed(() => tabs?.activeTab.value === props.id);

onMounted(() => {
  tabs?.registerTab(props.id, props.label);
  // Activate first tab if none selected
  if (!tabs?.activeTab.value) {
    tabs!.activeTab.value = props.id;
  }
});
</script>

<template>
  <div v-show="isActive" class="ds-tab-panel">
    <slot />
  </div>
</template>

<style scoped>
.ds-tab-panel {
  display: block;
}
</style>
