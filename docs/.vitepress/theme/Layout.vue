<script setup>
import DefaultTheme from "vitepress/theme";
import ReadingProgress from "./components/ReadingProgress.vue";
</script>

<template>
  <DefaultTheme.Layout>
    <template #layout-top>
      <ReadingProgress />
    </template>
  </DefaultTheme.Layout>
</template>
