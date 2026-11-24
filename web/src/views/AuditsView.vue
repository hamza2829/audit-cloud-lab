<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuditStore } from '@/stores/audit';
import { useSessionStore } from '@/stores/session';
import { SITES } from '@shared/seedData';
import { validateAudit, type Errors } from '@shared/validation';
import CalendarMonth from '@/components/CalendarMonth.vue';
import { todayIso } from '@/lib/services';

const store = useAuditStore();
const session = useSessionStore();
const router = useRouter();
onMounted(() => store.loadAll());

const view = ref<'list' | 'calendar'>('list');
const query = ref('');
const today = todayIso();
const cal = reactive({ year: Number(today.slice(0, 4)), month: Number(today.slice(5, 7)) });
function navigate(delta: number) {
  const m = cal.month - 1 + delta;
  cal.year += Math.floor(m / 12);
  cal.month = ((m % 12) + 12) % 12 + 1;
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return store.sortedAudits.filter((a) => !q || `${a.title} ${a.site}`.toLowerCase().includes(q));
});

const showForm = ref(false);
const form = reactive({ title: '', typeId: '', site: SITES[0]!, plannedDate: today });
const errors = ref<Errors>({});
async function create() {
  errors.value = validateAudit(form);
  if (Object.keys(errors.value).length) return;
  const id = await store.createAudit({ ...form, auditor: session.user?.email ?? '' });
  showForm.value = false;
  await router.push(`/audits/${id}`);
}
</script>

<template>
  <div class="page-head">
    <h1>Audits</h1>
    <button v-if="session.canWrite" type="button" class="primary" @click="showForm = !showForm">
      {{ showForm ? 'Cancel' : 'Plan audit' }}
    </button>
  </div>

  <form v-if="showForm" class="card form" novalidate aria-label="Plan audit" @submit.prevent="create">
    <label>Title <input v-model="form.title" name="auditTitle" /></label>
    <div class="row">
      <label>Type
        <select v-model="form.typeId" name="auditType">
          <option value="" disabled>Choose…</option>
          <option v-for="t in store.auditTypes" :key="t.id" :value="t.id">{{ t.name }}</option>
        </select>
      </label>
      <label>Site
        <select v-model="form.site" name="site"><option v-for="s in SITES" :key="s" :value="s">{{ s }}</option></select>
      </label>
      <label>Date <input v-model="form.plannedDate" name="plannedDate" type="date" /></label>
    </div>
    <p v-for="(msg, key) in errors" :key="key" class="error" role="alert">{{ msg }}</p>
    <button type="submit" class="primary">Create audit</button>
  </form>

  <div class="toolbar" role="group" aria-label="View">
    <button type="button" :aria-pressed="view === 'list'" @click="view = 'list'">List</button>
    <button type="button" :aria-pressed="view === 'calendar'" @click="view = 'calendar'">Calendar</button>
    <label v-if="view === 'list'" class="search">Search <input v-model="query" type="search" name="search" /></label>
  </div>

  <p v-if="store.loading" class="muted" aria-live="polite">Loading…</p>
  <ul v-if="view === 'list'" class="list" data-testid="audit-list">
    <li v-for="a in filtered" :key="a.id" class="list-item">
      <RouterLink :to="`/audits/${a.id}`"><strong>{{ a.title }}</strong></RouterLink>
      <span class="meta">{{ a.plannedDate }} · {{ a.site }} · <span class="badge" :class="`st-${a.status}`">{{ a.status.replace('_', ' ') }}</span></span>
    </li>
  </ul>
  <CalendarMonth v-else :audits="store.audits" :year="cal.year" :month="cal.month" @navigate="navigate" />
</template>
