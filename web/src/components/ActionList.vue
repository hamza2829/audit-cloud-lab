<script setup lang="ts">
import { computed } from 'vue';
import type { CorrectiveAction } from '@shared/types';
import { isOverdue } from '@shared/actions';

const props = defineProps<{ actions: CorrectiveAction[]; filter: 'all' | 'open' | 'overdue' | 'done'; today: string; canWrite: boolean }>();
const emit = defineEmits<{ (e: 'complete', id: string): void }>();

const overdue = (a: CorrectiveAction) => a.status === 'open' && (Boolean(a.overdue) || isOverdue(a, props.today));
const visible = computed(() =>
  [...props.actions]
    .filter((a) =>
      props.filter === 'all' ? true : props.filter === 'overdue' ? overdue(a) : a.status === props.filter,
    )
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.id.localeCompare(b.id)),
);
</script>

<template>
  <p v-if="visible.length === 0" class="muted">No actions in this view.</p>
  <ul v-else class="list" data-testid="action-list">
    <li v-for="a in visible" :key="a.id" class="list-item" :data-action-id="a.id">
      <div>
        <strong>{{ a.title }}</strong>
        <div class="meta">
{{ a.owner }} · due {{ a.dueDate }}
          <span v-if="overdue(a)" class="badge sev-critical">overdue</span>
          <span v-else-if="a.status === 'done'" class="badge done">done</span>
        </div>
      </div>
      <button v-if="canWrite && a.status === 'open'" type="button" @click="emit('complete', a.id)">Mark done</button>
    </li>
  </ul>
</template>
