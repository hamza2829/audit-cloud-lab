// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { setup } from './helpers';
import { useSessionStore } from '@/stores/session';
import { useAuditStore } from '@/stores/audit';

describe('session store', () => {
  it('logs in with role and exposes write permission', async () => {
    setup();
    const s = useSessionStore();
    await s.init();
    expect(await s.login('auditor@demo.test', 'pw')).toBe(true);
    expect(s.user?.role).toBe('auditor');
    expect(s.canWrite).toBe(true);
    expect(s.isManager).toBe(false);
  });
  it('reports failed login and viewer is read only', async () => {
    setup();
    const s = useSessionStore();
    expect(await s.login('auditor@demo.test', 'wrong')).toBe(false);
    expect(s.error).toMatch(/Sign in failed/);
    await s.login('viewer@demo.test', 'pw');
    expect(s.canWrite).toBe(false);
  });
});

describe('audit store', () => {
  it('loads seeded data and computes stats', async () => {
    setup();
    const a = useAuditStore();
    await a.loadAll();
    expect(a.audits).toHaveLength(40);
    expect(a.stats.findings).toBe(300);
    expect(a.rootCauses.length).toBeGreaterThan(0);
  });
  it('creates an audit with the type checklist', async () => {
    const { repo } = setup();
    const a = useAuditStore();
    await a.loadAll();
    const id = await a.createAudit({ title: 'New audit', typeId: 'safety', site: 'X', plannedDate: '2026-12-01', auditor: 'a' });
    const stored = repo.audits.find((x) => x.id === id)!;
    expect(stored.checklist).toHaveLength(4);
    expect(stored.checklist.every((c) => c.result === null)).toBe(true);
  });
  it('moves a planned audit to in progress when the checklist changes', async () => {
    const { repo } = setup();
    const a = useAuditStore();
    await a.loadAll();
    const planned = a.audits.find((x) => x.status === 'planned')!;
    await a.setChecklistResult(planned.id, planned.checklist[0]!.id, 'nok');
    expect(repo.audits.find((x) => x.id === planned.id)!.status).toBe('in_progress');
  });
  it('completes actions and runs the overdue check', async () => {
    const { repo } = setup();
    const a = useAuditStore();
    await a.loadAll();
    const open = a.actions.find((x) => x.status === 'open')!;
    await a.completeAction(open.id);
    expect(repo.actions.find((x) => x.id === open.id)!.status).toBe('done');
    const n = await a.runOverdueCheck('2030-01-01');
    expect(n).toBe(repo.actions.filter((x) => x.status === 'open').length);
  });
  it('captures load errors', async () => {
    const { repo } = setup();
    repo.listAudits = async () => { throw new Error('offline'); };
    const a = useAuditStore();
    await a.loadAll();
    expect(a.error).toMatch(/offline/);
  });
});
