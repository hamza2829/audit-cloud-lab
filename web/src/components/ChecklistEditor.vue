<script setup lang="ts">
import type { ChecklistItem, ChecklistResult } from '@shared/types';

defineProps<{ items: ChecklistItem[]; disabled?: boolean }>();
const emit = defineEmits<{ (e: 'change', itemId: string, result: ChecklistResult): void }>();
const OPTIONS: { value: Exclude<ChecklistResult, null>; label: string }[] = [
  { value: 'ok', label: 'OK' },
  { value: 'nok', label: 'Not OK' },
  { value: 'na', label: 'N/A' },
];
</script>

<template>
  <ol class="checklist">
    <li v-for="item in items" :key="item.id">
      <fieldset :disabled="disabled">
        <legend>{{ item.text }}</legend>
        <label v-for="o in OPTIONS" :key="o.value" class="choice" :class="o.value">
          <input
            type="radio"
            :name="`check-${item.id}`"
            :value="o.value"
            :checked="item.result === o.value"
            @change="emit('change', item.id, o.value)"
          />
          {{ o.label }}
        </label>
      </fieldset>
    </li>
  </ol>
</template>
