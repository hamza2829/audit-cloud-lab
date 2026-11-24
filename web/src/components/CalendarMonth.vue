<script setup lang="ts">
import { computed } from 'vue';
import type { Audit } from '@shared/types';
import { groupByDate, monthGrid } from '@shared/calendar';

const props = defineProps<{ audits: Audit[]; year: number; month: number }>();
const emit = defineEmits<{ (e: 'navigate', delta: number): void }>();

const weeks = computed(() => monthGrid(props.year, props.month));
const byDate = computed(() => groupByDate(props.audits));
const label = computed(() =>
  new Date(Date.UTC(props.year, props.month - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }),
);
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
</script>

<template>
  <div class="calendar">
    <div class="calendar-nav">
      <button type="button" aria-label="Previous month" @click="emit('navigate', -1)">&larr;</button>
      <h2 data-testid="calendar-label">{{ label }}</h2>
      <button type="button" aria-label="Next month" @click="emit('navigate', 1)">&rarr;</button>
    </div>
    <table>
      <caption class="sr-only">Audits planned in {{ label }}</caption>
      <thead>
        <tr><th v-for="d in DAYS" :key="d" scope="col">{{ d }}</th></tr>
      </thead>
      <tbody>
        <tr v-for="(week, i) in weeks" :key="i">
          <td v-for="day in week" :key="day.date" :class="{ out: !day.inMonth }" :data-date="day.date">
            <span class="day-num">{{ Number(day.date.slice(8)) }}</span>
            <RouterLink
              v-for="a in byDate.get(day.date) ?? []"
              :key="a.id"
              class="cal-audit"
              :to="`/audits/${a.id}`"
            >{{ a.title }}</RouterLink>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
