// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '@/App.vue';
import { useSessionStore } from '@/stores/session';
import { flush, setup } from './helpers';

async function mountApp(email?: string, path = '/') {
  const ctx = setup();
  const session = useSessionStore();
  await session.init();
  if (email) await session.login(email, 'pw');
  await ctx.router.push(path);
  await ctx.router.isReady();
  const w = mount(App, { global: { plugins: [ctx.pinia, ctx.router] }, attachTo: document.body });
  for (let i = 0; i < 5; i++) await flush();
  return { w, ...ctx };
}

describe('views', () => {
  it('redirects anonymous users to the login page', async () => {
    const { router, w } = await mountApp(undefined, '/audits');
    expect(router.currentRoute.value.name).toBe('login');
    expect(router.currentRoute.value.query.next).toBe('/audits');
    expect(w.text()).toContain('Sign in');
    w.unmount();
  });
  it('renders the dashboard with seeded counts', async () => {
    const { w } = await mountApp('auditor@demo.test', '/');
    expect(w.get('[aria-label=Audits] [data-testid=stat-value]').text()).toBe('40');
    expect(w.get('[aria-label=Findings] [data-testid=stat-value]').text()).toBe('300');
    expect(w.text()).toContain('Recurring root causes');
    w.unmount();
  });
  it('offers a skip link and a labelled main navigation', async () => {
    const { w } = await mountApp('auditor@demo.test', '/');
    expect(w.get('a.skip-link').attributes('href')).toBe('#main');
    expect(w.get('nav').attributes('aria-label')).toBe('Main');
    w.unmount();
  });
  it('hides write actions for viewers', async () => {
    const { w } = await mountApp('viewer@demo.test', '/audits');
    expect(w.text()).not.toContain('Plan audit');
    expect(w.findAll('[data-testid=audit-list] li')).toHaveLength(40);
    w.unmount();
  });
  it('adds a finding in the audit detail and shows the computed risk', async () => {
    const { w, repo, data, router } = await mountApp('auditor@demo.test', '/');
    const audit = data.audits.find((a) => a.status === 'in_progress')!;
    await router.push(`/audits/${audit.id}`);
    for (let i = 0; i < 5; i++) await flush();
    await w.get('input[name=title]').setValue('Unit test finding');
    await w.get('select[name=severity]').setValue('critical');
    await w.get('select[name=category]').setValue('PPE');
    await w.get('form[aria-label="New finding"]').trigger('submit');
    for (let i = 0; i < 5; i++) await flush();
    expect(repo.findings.some((f) => f.title === 'Unit test finding')).toBe(true);
    expect(w.get('[data-finding-title="Unit test finding"] [data-testid=risk]').text()).toMatch(/risk \d+/);
    w.unmount();
  });
});
