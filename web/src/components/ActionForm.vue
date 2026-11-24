<script setup lang="ts">
import { reactive, ref } from 'vue';
import { validateAction, type Errors } from '@shared/validation';
import { OWNERS } from '@shared/seedData';

const props = defineProps<{ findingTitle: string }>();
const emit = defineEmits<{ (e: 'submit', v: { title: string; owner: string; dueDate: string }): void }>();
const form = reactive({ title: `Fix: ${props.findingTitle}`, owner: '', dueDate: '' });
const errors = ref<Errors>({});

function submit() {
  errors.value = validateAction(form);
  if (Object.keys(errors.value).length) return;
  emit('submit', { ...form });
}
</script>

<template>
  <form class="form inline-form" novalidate aria-label="New corrective action" @submit.prevent="submit">
    <label>Action <input v-model="form.title" name="actionTitle" /></label>
    <label>Owner
      <input v-model="form.owner" name="owner" list="owners" />
      <datalist id="owners"><option v-for="o in OWNERS" :key="o" :value="o" /></datalist>
    </label>
    <label>Due date <input v-model="form.dueDate" name="dueDate" type="date" /></label>
    <p v-for="(msg, key) in errors" :key="key" class="error" role="alert">{{ msg }}</p>
    <button type="submit" class="primary">Save action</button>
  </form>
</template>
