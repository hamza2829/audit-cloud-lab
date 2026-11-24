<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import type { ChecklistResult, Finding, Severity } from '@shared/types';
import { useAuditStore } from '@/stores/audit';
import { useSessionStore } from '@/stores/session';
import { getRepo } from '@/lib/services';
import { downloadText } from '@/lib/image';
import ChecklistEditor from '@/components/ChecklistEditor.vue';
import FindingForm from '@/components/FindingForm.vue';
import ActionForm from '@/components/ActionForm.vue';
import SeverityBadge from '@/components/SeverityBadge.vue';

const props = defineProps<{ id: string }>();
const store = useAuditStore();
const session = useSessionStore();
const findings = ref<Finding[]>([]);
const status = ref('');
const actionFor = ref<string | null>(null);
let stop: (() => void) | null = null;

const audit = computed(() => store.audits.find((a) => a.id === props.id));
const sortedFindings = computed(() => [...findings.value].sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id)));

function subscribe() {
  stop?.();
  stop = getRepo().watchFindings(props.id, (list) => {
    findings.value = list;
    store.mergeFindings(props.id, list);
  });
}
onMounted(async () => {
  await store.loadAll();
  subscribe();
});
watch(() => props.id, subscribe);
onUnmounted(() => stop?.());

async function onCheck(itemId: string, result: ChecklistResult) {
  await store.setChecklistResult(props.id, itemId, result);
  status.value = 'Checklist saved.';
}
async function onFinding(v: { title: string; description: string; severity: Severity; category: string; imageDataUrl: string | null }) {
  await store.addFinding({
    ...v,
    auditId: props.id,
    createdAt: new Date().toISOString(),
    createdBy: session.user?.email ?? '',
  });
  status.value = 'Finding added. Risk score is calculated by the server.';
}
async function onAction(f: Finding, v: { title: string; owner: string; dueDate: string }) {
  await store.addAction({ ...v, findingId: f.id, auditId: f.auditId, status: 'open' });
  actionFor.value = null;
  status.value = 'Corrective action saved.';
}
async function exportCsv() {
  const csv = await getRepo().exportCsv(props.id);
  downloadText(`findings-${props.id}.csv`, csv);
  status.value = 'CSV exported.';
}
</script>

<template>
  <p v-if="!audit" class="muted">{{ store.loading ? 'Loading…' : 'Audit not found.' }}</p>
  <template v-else>
    <div class="page-head">
      <div>
        <h1>{{ audit.title }}</h1>
        <p class="meta">
{{ store.typeName(audit.typeId) }} · {{ audit.site }} · {{ audit.plannedDate }} ·
          <span class="badge" :class="`st-${audit.status}`" data-testid="audit-status">{{ audit.status.replace('_', ' ') }}</span>
        </p>
      </div>
      <div class="btns">
        <button type="button" @click="exportCsv">Export CSV</button>
        <button v-if="session.canWrite && audit.status !== 'closed'" type="button" @click="store.setAuditStatus(audit.id, 'closed')">Close audit</button>
      </div>
    </div>
    <p class="sr-only" aria-live="polite" data-testid="status">{{ status }}</p>
    <p v-if="status" class="notice" aria-hidden="true">{{ status }}</p>

    <section class="card" aria-labelledby="cl-title">
      <h2 id="cl-title">Checklist</h2>
      <ChecklistEditor :items="audit.checklist" :disabled="!session.canWrite || audit.status === 'closed'" @change="onCheck" />
    </section>

    <FindingForm v-if="session.canWrite && audit.status !== 'closed'" @submit="onFinding" />

    <section class="card" aria-labelledby="f-title">
      <h2 id="f-title">Findings ({{ findings.length }})</h2>
      <ul class="list" data-testid="finding-list">
        <li v-for="f in sortedFindings" :key="f.id" class="list-item finding" :data-finding-title="f.title">
          <div>
            <strong>{{ f.title }}</strong> <SeverityBadge :severity="f.severity" />
            <div class="meta">
{{ f.category }} ·
              <span data-testid="risk">{{ typeof f.riskScore === 'number' ? `risk ${f.riskScore} (${f.riskBand})` : 'risk pending' }}</span>
            </div>
            <img v-if="f.imageDataUrl" :src="f.imageDataUrl" :alt="`Photo for ${f.title}`" class="thumb" />
          </div>
          <div v-if="session.canWrite">
            <button v-if="actionFor !== f.id" type="button" @click="actionFor = f.id">Add action</button>
            <ActionForm v-else :finding-title="f.title" @submit="(v) => onAction(f, v)" />
          </div>
        </li>
      </ul>
    </section>
  </template>
</template>
