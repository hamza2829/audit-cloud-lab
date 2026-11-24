import { describe, expect, it } from 'vitest';
import { findingsCsv, planOverdueCheck, scoreFinding } from '../../functions/src/logic';
import type { Finding } from '@shared/types';

describe('cloud function logic', () => {
  it('scores a new finding with repeats', () => {
    expect(scoreFinding('high', 1)).toEqual({ riskScore: 65, riskBand: 'high' });
  });
  it('plans overdue flags', () => {
    const plan = planOverdueCheck(
      [{ id: 'a', findingId: 'f', auditId: 'x', title: 't', owner: 'o', dueDate: '2020-01-01', status: 'open' }],
      '2026-01-01',
    );
    expect(plan).toEqual([{ id: 'a', overdue: true }]);
  });
  it('exports findings sorted by id with header', () => {
    const f = (id: string): Finding => ({
      id, auditId: 'a1', title: `T ${id}`, description: '', severity: 'low', category: 'PPE', riskScore: 20, createdAt: '2026-01-01T00:00:00Z', createdBy: 'x',
    });
    const lines = findingsCsv([f('b'), f('a')]).trim().split('\r\n');
    expect(lines[0]).toBe('id,auditId,title,severity,category,riskScore,createdAt');
    expect(lines[1]!.startsWith('a,')).toBe(true);
    expect(lines).toHaveLength(3);
  });
});
