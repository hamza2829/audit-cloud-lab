<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useAuditStore } from '@/stores/audit';
import { useSessionStore } from '@/stores/session';
import { todayIso } from '@/lib/services';
import ActionList from '@/components/ActionList.vue';

const store = useAuditStore();
const session = useSessionStore();
onMounted(() => store.loadAll());
const filter = ref<'all' | 'open' | 'overdue' | 'done'>('open');
const message = ref('');
const today = todayIso();

async function runCheck() {
  const n = await store.runOverdueCheck();
  message.value = `Overdue check updated ${n} actions.`;
}
</script>

<template>
  <div class="page-head">
    <h1>Corrective actions</h1>
    <button v-if="session.isManager" type="button" @click="runCheck">Run overdue check</button>
  </div>
  <p class="notice" aria-live="polite" data-testid="check-result">{{ message }}</p>
  <div class="toolbar" role="group" aria-label="Filter actions">
    <button v-for="f in (['open', 'overdue', 'done', 'all'] as const)" :key="f" type="button" :aria-pressed="filter === f" @click="filter = f">
      {{ f }}
    </button>
  </div>
  <ActionList :actions="store.actions" :filter="filter" :today="today" :can-write="session.canWrite" @complete="store.completeAction" />
</template>
