import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import { makeRouter } from './router';
import { configureServices } from './lib/services';
import { useSessionStore } from './stores/session';
import './style.css';

async function start() {
  if (import.meta.env.VITE_BACKEND === 'memory') {
    const { createMemoryBackend } = await import('./lib/memoryBackend');
    const { repo, auth } = createMemoryBackend();
    configureServices(repo, auth);
  } else {
    const { firebaseAuth, firebaseRepo } = await import('./lib/firebaseRepo');
    configureServices(firebaseRepo, firebaseAuth);
  }
  const app = createApp(App);
  app.use(createPinia());
  await useSessionStore().init();
  app.use(makeRouter());
  app.mount('#app');
}

void start();
