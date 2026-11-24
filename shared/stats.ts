import type { Audit, AuditType, CorrectiveAction, Finding, Severity } from './types';
import { SEVERITIES } from './types';
import { isOverdue } from './actions';

export interface DashboardStats {
  audits: number;
  closedAudits: number;
  findings: number;
  bySeverity: Record<Severity, number>;
  openActions: number;
  overdueActions: number;
  deviationRate: number; // nok / (ok + nok), 0..1
  deviationByType: { typeId: string; name: string; rate: number; checked: number }[];
}

function deviation(audits: Audit[]): { rate: number; checked: number } {
  let ok = 0;
  let nok = 0;
  for (const a of audits) {
    for (const item of a.checklist) {
      if (item.result === 'ok') ok++;
      else if (item.result === 'nok') nok++;
    }
  }
  const checked = ok + nok;
  return { rate: checked === 0 ? 0 : nok / checked, checked };
}

export function dashboardStats(
  audits: Audit[],
  findings: Finding[],
  actions: CorrectiveAction[],
  types: AuditType[],
  today: string,
): DashboardStats {
  const bySeverity = Object.fromEntries(SEVERITIES.map((s) => [s, 0])) as Record<Severity, number>;
  for (const f of findings) bySeverity[f.severity]++;
  const overall = deviation(audits);
  return {
    audits: audits.length,
    closedAudits: audits.filter((a) => a.status === 'closed').length,
    findings: findings.length,
    bySeverity,
    openActions: actions.filter((a) => a.status === 'open').length,
    overdueActions: actions.filter((a) => isOverdue(a, today)).length,
    deviationRate: overall.rate,
    deviationByType: types.map((t) => {
      const d = deviation(audits.filter((a) => a.typeId === t.id));
      return { typeId: t.id, name: t.name, ...d };
    }),
  };
}
