import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { useSessionStore } from '@/stores/session';

export const routes: RouteRecordRaw[] = [
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { public: true, title: 'Sign in' } },
  { path: '/', name: 'dashboard', component: () => import('@/views/DashboardView.vue'), meta: { title: 'Dashboard' } },
  { path: '/audits', name: 'audits', component: () => import('@/views/AuditsView.vue'), meta: { title: 'Audits' } },
  { path: '/audits/:id', name: 'audit', component: () => import('@/views/AuditDetailView.vue'), props: true, meta: { title: 'Audit' } },
  { path: '/actions', name: 'actions', component: () => import('@/views/ActionsView.vue'), meta: { title: 'Actions' } },
  { path: '/templates', name: 'templates', component: () => import('@/views/TemplatesView.vue'), meta: { title: 'Templates' } },
  { path: '/:pathMatch(.*)*', name: 'notfound', component: () => import('@/views/NotFoundView.vue'), meta: { public: true, title: 'Not found' } },
];

export function makeRouter(history = createWebHistory()) {
  const router = createRouter({ history, routes });
  router.beforeEach((to) => {
    const session = useSessionStore();
    if (!to.meta.public && !session.user) return { name: 'login', query: { next: to.fullPath } };
    if (to.name === 'login' && session.user) return { name: 'dashboard' };
    return true;
  });
  router.afterEach((to) => {
    if (typeof document !== 'undefined') document.title = `${String(to.meta.title ?? 'Audit Cloud')} · Audit Cloud`;
  });
  return router;
}
