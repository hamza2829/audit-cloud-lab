import { riskBand, riskScore } from '../../shared/risk';
import { overdueUpdates } from '../../shared/actions';
import { toCsv } from '../../shared/csv';
import type { CorrectiveAction, Finding, Severity } from '../../shared/types';

/** Pure helpers so the Cloud Functions can be unit tested without the emulator. */
export function scoreFinding(severity: Severity, sameCategoryOnSite: number) {
  const score = riskScore(severity, sameCategoryOnSite);
  return { riskScore: score, riskBand: riskBand(score) };
}

export function planOverdueCheck(actions: CorrectiveAction[], today: string) {
  return overdueUpdates(actions, today);
}

export function findingsCsv(findings: Finding[]): string {
  const sorted = [...findings].sort((a, b) => a.id.localeCompare(b.id));
  return toCsv(sorted, [
    { header: 'id', value: (f) => f.id },
    { header: 'auditId', value: (f) => f.auditId },
    { header: 'title', value: (f) => f.title },
    { header: 'severity', value: (f) => f.severity },
    { header: 'category', value: (f) => f.category },
    { header: 'riskScore', value: (f) => f.riskScore ?? '' },
    { header: 'createdAt', value: (f) => f.createdAt },
  ]);
}
