import type { Audit, AuditType, CorrectiveAction, Finding } from '@shared/types';
import { findingsCsv, planOverdueCheck, scoreFinding } from '../../../functions/src/logic';
import type { AuthService, NewAction, NewFinding, Repo, SessionUser } from './repo';

const clone = <T>(x: T): T => (x === undefined ? x : (JSON.parse(JSON.stringify(x)) as T));

/** In-memory Repo used by component and store tests. Mirrors the Cloud Function behaviour synchronously. */
export class MemoryRepo implements Repo {
  auditTypes: AuditType[];
  audits: Audit[];
  findings: Finding[];
  actions: CorrectiveAction[];
  private seq = 0;
  private watchers = new Map<string, Set<(f: Finding[]) => void>>();

  constructor(data: { auditTypes?: AuditType[]; audits?: Audit[]; findings?: Finding[]; actions?: CorrectiveAction[] } = {}) {
    this.auditTypes = clone(data.auditTypes ?? []);
    this.audits = clone(data.audits ?? []);
    this.findings = clone(data.findings ?? []);
    this.actions = clone(data.actions ?? []);
  }

  private id(prefix: string) {
    this.seq += 1;
    return `${prefix}-new-${this.seq}`;
  }

  private notify(auditId: string) {
    const list = this.findings.filter((f) => f.auditId === auditId);
    this.watchers.get(auditId)?.forEach((cb) => cb(clone(list)));
  }

  async listAuditTypes() { return clone(this.auditTypes); }
  async listAudits() { return clone(this.audits); }
  async createAudit(audit: Omit<Audit, 'id'>) {
    const id = this.id('audit');
    this.audits.push({ id, ...clone(audit) });
    return id;
  }
  async updateAudit(id: string, patch: Partial<Omit<Audit, 'id'>>) {
    const a = this.audits.find((x) => x.id === id);
    if (!a) throw new Error('not found');
    Object.assign(a, clone(patch));
  }
  async listFindings() { return clone(this.findings); }
  watchFindings(auditId: string, cb: (f: Finding[]) => void) {
    const set = this.watchers.get(auditId) ?? new Set();
    set.add(cb);
    this.watchers.set(auditId, set);
    cb(clone(this.findings.filter((f) => f.auditId === auditId)));
    return () => set.delete(cb);
  }
  async createFinding(finding: NewFinding) {
    const id = this.id('finding');
    const repeats = this.findings.filter((f) => f.category === finding.category).length;
    this.findings.push({ id, ...clone(finding), ...scoreFinding(finding.severity, repeats) });
    this.notify(finding.auditId);
    return id;
  }
  async listActions() { return clone(this.actions); }
  async createAction(action: NewAction) {
    const id = this.id('action');
    this.actions.push({ id, ...clone(action), overdue: false });
    return id;
  }
  async updateAction(id: string, patch: Partial<Pick<CorrectiveAction, 'status' | 'owner' | 'dueDate'>>) {
    const a = this.actions.find((x) => x.id === id);
    if (!a) throw new Error('not found');
    Object.assign(a, patch);
  }
  async exportCsv(auditId?: string) {
    return findingsCsv(auditId ? this.findings.filter((f) => f.auditId === auditId) : this.findings);
  }
  async triggerOverdueCheck(today = new Date().toISOString().slice(0, 10)) {
    const updates = planOverdueCheck(this.actions, today);
    for (const u of updates) this.actions.find((a) => a.id === u.id)!.overdue = u.overdue;
    return updates.length;
  }
}

export class MemoryAuth implements AuthService {
  private listeners = new Set<(u: SessionUser | null) => void>();
  current: SessionUser | null = null;
  constructor(private users: Record<string, { password: string; role: SessionUser['role'] }> = {}) {}
  async signIn(email: string, password: string) {
    const u = this.users[email];
    if (!u || u.password !== password) throw new Error('auth/invalid-credential');
    this.current = { email, role: u.role };
    this.listeners.forEach((l) => l(this.current));
    return this.current;
  }
  async signOut() {
    this.current = null;
    this.listeners.forEach((l) => l(null));
  }
  onChange(cb: (u: SessionUser | null) => void) {
    this.listeners.add(cb);
    cb(this.current);
    return () => this.listeners.delete(cb);
  }
}
