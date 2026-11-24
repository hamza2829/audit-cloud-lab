import { describe, expect, it } from 'vitest';
import { riskBand, riskScore } from '@shared/risk';
import { csvCell, toCsv } from '@shared/csv';
import { addDays, isIsoDate } from '@shared/dates';
import { isOverdue, overdueUpdates } from '@shared/actions';
import { groupByDate, monthGrid } from '@shared/calendar';
import { dataUrlBytes, validateAction, validateAudit, validateFinding } from '@shared/validation';
import type { CorrectiveAction } from '@shared/types';

describe('risk score', () => {
  it('scales with severity', () => {
    expect(riskScore('low')).toBe(20);
    expect(riskScore('critical')).toBe(80);
  });
  it('adds 5 points per repeat, capped at 4 repeats', () => {
    expect(riskScore('medium', 2)).toBe(50);
    expect(riskScore('critical', 99)).toBe(100);
  });
  it('ignores negative repeat counts', () => {
    expect(riskScore('high', -3)).toBe(60);
  });
  it('maps scores to bands', () => {
    expect([20, 40, 60, 80].map(riskBand)).toEqual(['low', 'moderate', 'high', 'severe']);
  });
  it('rejects unknown severity', () => {
    expect(() => riskScore('extreme' as never)).toThrow();
  });
});

describe('csv', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(csvCell('a,b')).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell('line1\nline2')).toBe('"line1\nline2"');
  });
  it('neutralises formula injection', () => {
    expect(csvCell('=SUM(A1)')).toBe("'=SUM(A1)");
    expect(csvCell('@cmd')).toBe("'@cmd");
  });
  it('renders null as empty', () => {
    expect(csvCell(null)).toBe('');
  });
  it('builds header and rows with CRLF', () => {
    const csv = toCsv([{ a: 1, b: 'x' }], [{ header: 'a', value: (r) => r.a }, { header: 'b', value: (r) => r.b }]);
    expect(csv).toBe('a,b\r\n1,x\r\n');
  });
});

describe('dates', () => {
  it('validates ISO dates including impossible days', () => {
    expect(isIsoDate('2026-02-28')).toBe(true);
    expect(isIsoDate('2026-02-30')).toBe(false);
    expect(isIsoDate('28.02.2026')).toBe(false);
  });
  it('adds days across month ends', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});

describe('overdue actions', () => {
  const base: CorrectiveAction = { id: 'a', findingId: 'f', auditId: 'x', title: 't', owner: 'o', dueDate: '2026-01-10', status: 'open' };
  it('is overdue only when open and past due', () => {
    expect(isOverdue(base, '2026-01-11')).toBe(true);
    expect(isOverdue(base, '2026-01-10')).toBe(false);
    expect(isOverdue({ ...base, status: 'done' }, '2026-02-01')).toBe(false);
  });
  it('returns only changed flags', () => {
    const actions = [base, { ...base, id: 'b', overdue: true }, { ...base, id: 'c', status: 'done' as const, overdue: true }];
    expect(overdueUpdates(actions, '2026-02-01')).toEqual([
      { id: 'a', overdue: true },
      { id: 'c', overdue: false },
    ]);
  });
});

describe('calendar', () => {
  it('builds Monday-first full weeks', () => {
    const grid = monthGrid(2026, 11);
    expect(grid[0]![0]!.date).toBe('2026-10-26');
    expect(grid.every((w) => w.length === 7)).toBe(true);
    expect(grid.flat().filter((d) => d.inMonth)).toHaveLength(30);
  });
  it('handles February starting on Monday', () => {
    const grid = monthGrid(2027, 2);
    expect(grid[0]![0]!.date).toBe('2027-02-01');
    expect(grid).toHaveLength(4);
  });
  it('groups audits by planned date', () => {
    const map = groupByDate([{ plannedDate: '2026-01-01' }, { plannedDate: '2026-01-01' }, { plannedDate: '2026-01-02' }]);
    expect(map.get('2026-01-01')).toHaveLength(2);
  });
});

describe('validation', () => {
  it('accepts a valid finding', () => {
    expect(validateFinding({ title: 'Valid title', severity: 'low', category: 'PPE' })).toEqual({});
  });
  it('flags missing severity, category and short title', () => {
    expect(Object.keys(validateFinding({ title: 'x' })).sort()).toEqual(['category', 'severity', 'title']);
  });
  it('rejects non image data urls and big images', () => {
    expect(validateFinding({ title: 'abc', severity: 'low', category: 'PPE', imageDataUrl: 'data:text/plain;base64,AAAA' }).image).toBeDefined();
    const big = `data:image/png;base64,${'A'.repeat(220_000)}`;
    expect(validateFinding({ title: 'abc', severity: 'low', category: 'PPE', imageDataUrl: big }).image).toMatch(/150 KB/);
  });
  it('computes data url byte size', () => {
    expect(dataUrlBytes('data:image/png;base64,AAAA')).toBe(3);
    expect(dataUrlBytes('data:image/png;base64,AA==')).toBe(1);
    expect(Number.isNaN(dataUrlBytes('nope'))).toBe(true);
  });
  it('validates actions and audits', () => {
    expect(validateAction({ title: 'Fix it', owner: 'QA', dueDate: '2026-12-01' })).toEqual({});
    expect(Object.keys(validateAction({ title: 'Fix', owner: '', dueDate: '2026-13-01' }))).toEqual(['owner', 'dueDate']);
    expect(Object.keys(validateAudit({ title: 'A', site: '' }))).toEqual(['title', 'typeId', 'site', 'plannedDate']);
  });
});
