<script setup lang="ts">
import { ref, provide, watch, onMounted } from "vue";

interface Props {
  defaultValue?: string;
}

const props = withDefaults(defineProps<Props>(), {
  defaultValue: "",
});

const activeTab = ref(props.defaultValue);
const tabs: { id: string; label: string }[] = [];

function registerTab(id: string, label: string) {
  tabs.push({ id, label });
}

function selectTab(id: string) {
  activeTab.value = id;
}

provide("tabs", { activeTab, registerTab, selectTab });
</script>

<template>
  <div class="ds-tabs">
    <div class="ds-tabs__header">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        :class="['ds-tabs__tab', { active: activeTab === tab.id }]"
        @click="selectTab(tab.id)"
      >
        {{ tab.label }}
      </button>
    </div>
    <div class="ds-tabs__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ds-tabs {
  border: 1px solid var(--ds-hairline);
  border-radius: var(--ds-rounded-md);
  overflow: hidden;
  margin: 1.6em 0;
}

.ds-tabs__header {
  display: flex;
  background: var(--ds-surface-soft);
  border-bottom: 1px solid var(--ds-hairline);
  overflow-x: auto;
}

.ds-tabs__tab {
  flex-shrink: 0;
  padding: 10px 20px;
  font-family: var(--ds-font-sans);
  font-size: 13px;
  font-weight: 500;
  color: var(--ds-muted);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}

.ds-tabs__tab:hover {
  color: var(--ds-ink);
}

.ds-tabs__tab.active {
  color: var(--ds-primary);
  border-bottom-color: var(--ds-primary);
}

.ds-tabs__body {
  padding: 16px;
}

:deep(.ds-tabs__body div[class*="language-"]) {
  margin: 0 !important;
  border-radius: var(--ds-rounded-sm);
}
</style>
