<script setup lang="ts">
defineProps<{ label: string; value: string | number; hint?: string; tone?: 'default' | 'warn' | 'bad' }>();
</script>

<template>
  <div class="stat" :class="tone ?? 'default'" role="group" :aria-label="label">
    <span class="stat-label">{{ label }}</span>
    <strong class="stat-value" data-testid="stat-value">{{ value }}</strong>
    <span v-if="hint" class="stat-hint">{{ hint }}</span>
  </div>
</template>
