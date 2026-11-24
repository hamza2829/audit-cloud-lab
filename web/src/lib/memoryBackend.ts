import { generateSeed } from '@shared/seedData';
import { MemoryAuth, MemoryRepo } from './memoryRepo';
import { todayIso } from './services';

/** Offline demo backend (VITE_BACKEND=memory): same seed data, kept in the browser tab only. */
export function createMemoryBackend() {
  const repo = new MemoryRepo(generateSeed({ seed: 42, today: todayIso() }));
  const auth = new MemoryAuth({
    'auditor@demo.test': { password: 'demo-password', role: 'auditor' },
    'manager@demo.test': { password: 'demo-password', role: 'manager' },
    'viewer@demo.test': { password: 'demo-password', role: 'viewer' },
  });
  return { repo, auth };
}
