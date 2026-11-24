import { createPinia, setActivePinia } from 'pinia';
import { createMemoryHistory } from 'vue-router';
import { generateSeed } from '@shared/seedData';
import { MemoryAuth, MemoryRepo } from '@/lib/memoryRepo';
import { configureServices } from '@/lib/services';
import { makeRouter } from '@/router';

export function setup(opts: { small?: boolean } = {}) {
  const data = generateSeed({ seed: 1, today: '2026-11-24', ...(opts.small ? { audits: 6, findings: 20 } : {}) });
  const repo = new MemoryRepo(data);
  const auth = new MemoryAuth({
    'auditor@demo.test': { password: 'pw', role: 'auditor' },
    'viewer@demo.test': { password: 'pw', role: 'viewer' },
    'manager@demo.test': { password: 'pw', role: 'manager' },
  });
  configureServices(repo, auth);
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = makeRouter(createMemoryHistory());
  return { repo, auth, pinia, router, data };
}

export const flush = () => new Promise((r) => setTimeout(r, 0));
