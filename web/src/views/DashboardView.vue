<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAuditStore } from '@/stores/audit';
import StatCard from '@/components/StatCard.vue';
import SeverityChart from '@/components/SeverityChart.vue';
import RootCauseList from '@/components/RootCauseList.vue';

const store = useAuditStore();
onMounted(() => store.loadAll());
const s = computed(() => store.stats);
const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
</script>

<template>
  <h1>Dashboard</h1>
  <p v-if="store.error" class="error" role="alert">{{ store.error }}</p>
  <div class="stats" data-testid="stats">
    <StatCard label="Audits" :value="s.audits" :hint="`${s.closedAudits} closed`" />
    <StatCard label="Findings" :value="s.findings" />
    <StatCard label="Open actions" :value="s.openActions" />
    <StatCard label="Overdue actions" :value="s.overdueActions" :tone="s.overdueActions ? 'bad' : 'default'" />
    <StatCard label="Deviation rate" :value="pct(s.deviationRate)" hint="Not OK / checked items" :tone="s.deviationRate > 0.2 ? 'warn' : 'default'" />
  </div>
  <div class="grid2">
    <section class="card"><SeverityChart :counts="s.bySeverity" /></section>
    <section class="card" aria-labelledby="dev-title">
      <h2 id="dev-title">Deviation by audit type</h2>
      <table class="table">
        <thead><tr><th scope="col">Audit type</th><th scope="col">Checked items</th><th scope="col">Deviation</th></tr></thead>
        <tbody>
          <tr v-for="d in s.deviationByType" :key="d.typeId">
            <td>{{ d.name }}</td><td>{{ d.checked }}</td><td>{{ pct(d.rate) }}</td>
          </tr>
        </tbody>
      </table>
    </section>
  </div>
  <RootCauseList :suggestions="store.rootCauses" />
</template>
