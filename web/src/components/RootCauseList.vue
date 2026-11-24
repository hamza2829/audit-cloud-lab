<script setup lang="ts">
import type { RootCauseSuggestion } from '@ai/rootCauses';
defineProps<{ suggestions: RootCauseSuggestion[] }>();
</script>

<template>
  <section class="card" aria-labelledby="rc-title">
    <h2 id="rc-title">Recurring root causes (suggested)</h2>
    <p class="muted small">Grouped by text similarity (TF-IDF, local). Suggestions only, check before acting.</p>
    <p v-if="suggestions.length === 0" class="muted">Not enough similar findings yet.</p>
    <ol v-else class="rc-list">
      <li v-for="s in suggestions" :key="s.cluster">
        <strong>{{ s.rootCause }}</strong> <span class="muted">({{ s.size }} findings)</span>
        <div class="small">Keywords: {{ s.keywords.join(', ') }}</div>
      </li>
    </ol>
  </section>
</template>
