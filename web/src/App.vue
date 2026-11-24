<script setup lang="ts">
import { useRouter } from 'vue-router';
import { useSessionStore } from '@/stores/session';

const session = useSessionStore();
const router = useRouter();
async function logout() {
  await session.logout();
  await router.push('/login');
}
</script>

<template>
  <a class="skip-link" href="#main">Skip to content</a>
  <header v-if="session.user" class="topbar">
    <span class="brand">Audit Cloud</span>
    <nav aria-label="Main">
      <RouterLink to="/">Dashboard</RouterLink>
      <RouterLink to="/audits">Audits</RouterLink>
      <RouterLink to="/actions">Actions</RouterLink>
      <RouterLink to="/templates">Templates</RouterLink>
    </nav>
    <span class="user" data-testid="user">{{ session.user.email }} ({{ session.user.role }})</span>
    <button type="button" class="link" @click="logout">Sign out</button>
  </header>
  <main id="main" tabindex="-1">
    <RouterView />
  </main>
</template>
