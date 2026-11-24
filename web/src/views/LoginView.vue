<script setup lang="ts">
import { ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const busy = ref(false);

async function submit() {
  busy.value = true;
  const ok = await session.login(email.value, password.value);
  busy.value = false;
  if (ok) await router.push((route.query.next as string) || '/');
}
</script>

<template>
  <section class="login card">
    <h1>Audit Cloud</h1>
    <p class="muted">Sign in to plan audits and record findings. Local demo users are listed in the README.</p>
    <form class="form" @submit.prevent="submit">
      <label>Email <input v-model="email" name="email" type="email" autocomplete="username" required /></label>
      <label>Password <input v-model="password" name="password" type="password" autocomplete="current-password" required /></label>
      <p v-if="session.error" class="error" role="alert">{{ session.error }}</p>
      <button type="submit" class="primary" :disabled="busy">{{ busy ? 'Signing in…' : 'Sign in' }}</button>
    </form>
  </section>
</template>
