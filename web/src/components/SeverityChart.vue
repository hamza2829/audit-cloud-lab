<script setup lang="ts">
import { computed } from 'vue';
import { SEVERITIES, type Severity } from '@shared/types';

const props = defineProps<{ counts: Record<Severity, number> }>();
const max = computed(() => Math.max(1, ...SEVERITIES.map((s) => props.counts[s])));
</script>

<template>
  <figure class="chart">
    <figcaption>Findings by severity</figcaption>
    <ul class="bars">
      <li v-for="s in SEVERITIES" :key="s" class="bar-row">
        <span class="bar-label">{{ s }}</span>
        <span class="bar-track" aria-hidden="true">
          <span class="bar" :class="`sev-${s}`" :style="{ width: `${(props.counts[s] / max) * 100}%` }"></span>
        </span>
        <span class="bar-value" :data-testid="`sev-count-${s}`">{{ props.counts[s] }}</span>
      </li>
    </ul>
  </figure>
</template>
