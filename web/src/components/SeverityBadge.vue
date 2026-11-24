<script setup lang="ts">
import type { Severity } from '@shared/types';
defineProps<{ severity: Severity }>();
</script>

<template>
  <span class="badge" :class="`sev-${severity}`">{{ severity }}</span>
</template>
