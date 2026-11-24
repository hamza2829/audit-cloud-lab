import { defineStore } from 'pinia';
import type { Audit, AuditType, ChecklistResult, CorrectiveAction, Finding } from '@shared/types';
import { dashboardStats } from '@shared/stats';
import { suggestRootCauses } from '@ai/rootCauses';
import { getRepo, todayIso } from '@/lib/services';
import type { NewAction, NewFinding } from '@/lib/repo';

export const useAuditStore = defineStore('audit', {
  state: () => ({
    auditTypes: [] as AuditType[],
    audits: [] as Audit[],
    findings: [] as Finding[],
    actions: [] as CorrectiveAction[],
    loaded: false,
    loading: false,
    error: '',
  }),
  getters: {
    stats: (s) => dashboardStats(s.audits, s.findings, s.actions, s.auditTypes, todayIso()),
    sortedAudits: (s) => [...s.audits].sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.title.localeCompare(b.title)),
    rootCauses: (s) =>
      suggestRootCauses(
        s.findings.map((f) => ({ id: f.id, text: f.title })),
        { minSize: 5 },
      ).slice(0, 5),
    typeName: (s) => (id: string) => s.auditTypes.find((t) => t.id === id)?.name ?? id,
  },
  actions: {
    async loadAll(force = false) {
      if (this.loaded && !force) return;
      this.loading = true;
      this.error = '';
      try {
        const repo = getRepo();
        const [types, audits, findings, actions] = await Promise.all([
          repo.listAuditTypes(), repo.listAudits(), repo.listFindings(), repo.listActions(),
        ]);
        this.auditTypes = types;
        this.audits = audits;
        this.findings = findings;
        this.actions = actions;
        this.loaded = true;
      } catch (e) {
        this.error = `Could not load data: ${(e as Error).message}`;
      } finally {
        this.loading = false;
      }
    },
    async createAudit(input: { title: string; typeId: string; site: string; plannedDate: string; auditor: string }) {
      const type = this.auditTypes.find((t) => t.id === input.typeId);
      const audit: Omit<Audit, 'id'> = {
        ...input,
        status: 'planned',
        checklist: (type?.checklist ?? []).map((c) => ({ ...c, result: null })),
      };
      const id = await getRepo().createAudit(audit);
      this.audits.push({ id, ...audit });
      return id;
    },
    async setChecklistResult(auditId: string, itemId: string, result: ChecklistResult) {
      const audit = this.audits.find((a) => a.id === auditId);
      if (!audit) return;
      const checklist = audit.checklist.map((c) => (c.id === itemId ? { ...c, result } : c));
      const status = audit.status === 'planned' ? 'in_progress' : audit.status;
      await getRepo().updateAudit(auditId, { checklist, status });
      audit.checklist = checklist;
      audit.status = status;
    },
    async setAuditStatus(auditId: string, status: Audit['status']) {
      await getRepo().updateAudit(auditId, { status });
      const audit = this.audits.find((a) => a.id === auditId);
      if (audit) audit.status = status;
    },
    async addFinding(finding: NewFinding) {
      return getRepo().createFinding(finding);
    },
    mergeFindings(auditId: string, list: Finding[]) {
      this.findings = [...this.findings.filter((f) => f.auditId !== auditId), ...list];
    },
    async addAction(action: NewAction) {
      const id = await getRepo().createAction(action);
      this.actions.push({ id, ...action, overdue: false });
      return id;
    },
    async completeAction(id: string) {
      await getRepo().updateAction(id, { status: 'done' });
      const a = this.actions.find((x) => x.id === id);
      if (a) {
        a.status = 'done';
        a.overdue = false;
      }
    },
    async runOverdueCheck(today?: string) {
      const n = await getRepo().triggerOverdueCheck(today);
      this.actions = await getRepo().listActions();
      return n;
    },
  },
});
