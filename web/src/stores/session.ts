import { defineStore } from 'pinia';
import { getAuthService } from '@/lib/services';
import type { SessionUser } from '@/lib/repo';

export const useSessionStore = defineStore('session', {
  state: () => ({ user: null as SessionUser | null, ready: false, error: '' }),
  getters: {
    canWrite: (s) => s.user?.role === 'auditor' || s.user?.role === 'manager',
    isManager: (s) => s.user?.role === 'manager',
  },
  actions: {
    init(): Promise<void> {
      return new Promise((resolve) => {
        getAuthService().onChange((user) => {
          this.user = user;
          this.ready = true;
          resolve();
        });
      });
    },
    async login(email: string, password: string) {
      this.error = '';
      try {
        this.user = await getAuthService().signIn(email.trim(), password);
        return true;
      } catch {
        this.error = 'Sign in failed. Check email and password.';
        return false;
      }
    },
    async logout() {
      await getAuthService().signOut();
      this.user = null;
    },
  },
});
