<script setup lang="ts">
import { onMounted } from 'vue';
import { useAuditStore } from '@/stores/audit';

const store = useAuditStore();
onMounted(() => store.loadAll());
</script>

<template>
  <h1>Checklist templates</h1>
  <section v-for="t in store.auditTypes" :key="t.id" class="card">
    <h2>{{ t.name }}</h2>
    <ol><li v-for="c in t.checklist" :key="c.id">{{ c.text }}</li></ol>
  </section>
</template>
