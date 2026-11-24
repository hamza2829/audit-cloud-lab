<script setup lang="ts">
import { reactive, ref } from 'vue';
import { SEVERITIES, type Severity } from '@shared/types';
import { validateFinding, type Errors } from '@shared/validation';
import { CATEGORY_PHRASES } from '@shared/seedData';
import { prepareImage } from '@/lib/image';

const emit = defineEmits<{
  (e: 'submit', v: { title: string; description: string; severity: Severity; category: string; imageDataUrl: string | null }): void;
}>();
const categories = Object.keys(CATEGORY_PHRASES);
const form = reactive({ title: '', description: '', severity: '' as Severity | '', category: '', imageDataUrl: null as string | null });
const errors = ref<Errors>({});
const imageError = ref('');

async function onFile(ev: Event) {
  imageError.value = '';
  const file = (ev.target as HTMLInputElement).files?.[0];
  if (!file) return;
  try {
    form.imageDataUrl = await prepareImage(file);
  } catch {
    imageError.value = 'Could not read the image.';
  }
}

function submit() {
  const draft = { ...form, severity: form.severity || undefined };
  errors.value = validateFinding(draft);
  if (Object.keys(errors.value).length) return;
  emit('submit', { ...form, severity: form.severity as Severity });
  Object.assign(form, { title: '', description: '', severity: '', category: '', imageDataUrl: null });
}
</script>

<template>
  <form class="card form" novalidate aria-label="New finding" @submit.prevent="submit">
    <h3>New finding</h3>
    <label>Title
      <input v-model="form.title" name="title" required :aria-invalid="!!errors.title" />
    </label>
    <p v-if="errors.title" class="error" role="alert">{{ errors.title }}</p>
    <label>Description
      <textarea v-model="form.description" name="description" rows="3"></textarea>
    </label>
    <div class="row">
      <label>Severity
        <select v-model="form.severity" name="severity" required>
          <option value="" disabled>Choose…</option>
          <option v-for="s in SEVERITIES" :key="s" :value="s">{{ s }}</option>
        </select>
      </label>
      <label>Category
        <select v-model="form.category" name="category" required>
          <option value="" disabled>Choose…</option>
          <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
        </select>
      </label>
    </div>
    <p v-if="errors.severity" class="error" role="alert">{{ errors.severity }}</p>
    <p v-if="errors.category" class="error" role="alert">{{ errors.category }}</p>
    <label>Photo (optional)
      <input type="file" name="photo" accept="image/png,image/jpeg,image/webp" capture="environment" @change="onFile" />
    </label>
    <img v-if="form.imageDataUrl" :src="form.imageDataUrl" alt="Photo preview" class="thumb" />
    <p v-if="imageError || errors.image" class="error" role="alert">{{ imageError || errors.image }}</p>
    <button type="submit" class="primary">Add finding</button>
  </form>
</template>
