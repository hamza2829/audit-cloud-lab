import { describe, expect, it } from 'vitest';
import { generateSeed, AUDIT_TYPES } from '@shared/seedData';
import { dashboardStats } from '@shared/stats';
import { riskScore } from '@shared/risk';

const data = generateSeed({ seed: 42, today: '2026-11-24' });

describe('seed data', () => {
  it('creates 3 audit types, 40 audits and 300 findings', () => {
    expect(data.auditTypes).toHaveLength(3);
    expect(data.audits).toHaveLength(40);
    expect(data.findings).toHaveLength(300);
  });
  it('is deterministic for the same seed and differs for another', () => {
    expect(generateSeed({ seed: 42, today: '2026-11-24' })).toEqual(data);
    expect(generateSeed({ seed: 7, today: '2026-11-24' }).findings[0]).not.toEqual(data.findings[0]);
  });
  it('only attaches findings to executed audits', () => {
    const executed = new Set(data.audits.filter((a) => a.status !== 'planned').map((a) => a.id));
    expect(data.findings.every((f) => executed.has(f.auditId))).toBe(true);
  });
  it('creates actions for every non-low finding', () => {
    const nonLow = data.findings.filter((f) => f.severity !== 'low').length;
    expect(data.actions).toHaveLength(nonLow);
  });
  it('stores risk scores consistent with the scoring function', () => {
    for (const f of data.findings) expect(f.riskScore).toBeGreaterThanOrEqual(riskScore(f.severity));
  });
  it('copies checklist templates into audits', () => {
    for (const a of data.audits) {
      const t = AUDIT_TYPES.find((x) => x.id === a.typeId)!;
      expect(a.checklist.map((c) => c.id)).toEqual(t.checklist.map((c) => c.id));
    }
  });
});

describe('dashboard stats', () => {
  const s = dashboardStats(data.audits, data.findings, data.actions, data.auditTypes, '2026-11-24');
  it('counts severities to the total', () => {
    expect(Object.values(s.bySeverity).reduce((a, b) => a + b, 0)).toBe(300);
  });
  it('computes a deviation rate between 0 and 1 per type', () => {
    expect(s.deviationRate).toBeGreaterThan(0);
    expect(s.deviationRate).toBeLessThan(1);
    expect(s.deviationByType).toHaveLength(3);
  });
  it('returns zero deviation when nothing is checked', () => {
    expect(dashboardStats([], [], [], [], '2026-01-01').deviationRate).toBe(0);
  });
  it('counts overdue among open actions only', () => {
    expect(s.overdueActions).toBeLessThanOrEqual(s.openActions);
  });
});
