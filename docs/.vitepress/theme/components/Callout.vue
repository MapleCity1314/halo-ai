<script setup lang="ts">
interface Props {
  type?: "tip" | "info" | "warning" | "danger" | "note";
  title?: string;
  icon?: string;
}

const props = withDefaults(defineProps<Props>(), {
  type: "info",
});

const typeStyles: Record<string, { bg: string; border: string; text: string; iconBg: string }> = {
  tip: {
    bg: "rgba(204, 120, 92, 0.08)",
    border: "var(--ds-primary)",
    text: "var(--ds-ink)",
    iconBg: "var(--ds-primary)",
  },
  info: {
    bg: "rgba(93, 184, 166, 0.08)",
    border: "var(--ds-accent-teal)",
    text: "var(--ds-ink)",
    iconBg: "var(--ds-accent-teal)",
  },
  warning: {
    bg: "rgba(212, 160, 23, 0.08)",
    border: "var(--ds-warning)",
    text: "var(--ds-ink)",
    iconBg: "var(--ds-warning)",
  },
  danger: {
    bg: "rgba(198, 69, 69, 0.08)",
    border: "var(--ds-error)",
    text: "var(--ds-ink)",
    iconBg: "var(--ds-error)",
  },
  note: {
    bg: "var(--ds-surface-soft)",
    border: "var(--ds-hairline)",
    text: "var(--ds-ink)",
    iconBg: "var(--ds-muted)",
  },
};

const defaults: Record<string, string> = {
  tip: "💡",
  info: "ℹ️",
  warning: "⚠️",
  danger: "🚫",
  note: "📝",
};

const style = typeStyles[props.type];
const displayIcon = props.icon ?? defaults[props.type];
</script>

<template>
  <div
    class="ds-callout"
    :style="{
      background: style.bg,
      borderColor: style.border,
      color: style.text,
    }"
  >
    <div
      v-if="title || displayIcon"
      class="ds-callout__header"
    >
      <span v-if="displayIcon" class="ds-callout__icon">{{ displayIcon }}</span>
      <strong v-if="title" class="ds-callout__title">{{ title }}</strong>
    </div>
    <div class="ds-callout__body">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.ds-callout {
  border-left: 4px solid;
  border-radius: 0 var(--ds-rounded-md) var(--ds-rounded-md) 0;
  padding: 16px 20px;
  margin: 1.6em 0;
  font-size: var(--ds-body-sm-size);
  line-height: 1.6;
}

.ds-callout__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.ds-callout__icon {
  font-size: 16px;
  line-height: 1;
}

.ds-callout__title {
  font-weight: 600;
  font-size: 14px;
}

.ds-callout__body :deep(p) {
  margin: 8px 0 0 0;
}

.ds-callout__body :deep(p:first-child) {
  margin-top: 0;
}

.ds-callout__body :deep(code) {
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 6px;
  border-radius: 3px;
}
</style>
