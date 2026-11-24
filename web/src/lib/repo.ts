import type { Audit, AuditType, CorrectiveAction, Finding } from '@shared/types';

export type NewFinding = Omit<Finding, 'id' | 'riskScore' | 'riskBand'>;
export type NewAction = Omit<CorrectiveAction, 'id' | 'overdue'>;

/** Data access boundary. The app uses the Firestore implementation, tests use the in-memory one. */
export interface Repo {
  listAuditTypes(): Promise<AuditType[]>;
  listAudits(): Promise<Audit[]>;
  createAudit(audit: Omit<Audit, 'id'>): Promise<string>;
  updateAudit(id: string, patch: Partial<Omit<Audit, 'id'>>): Promise<void>;
  listFindings(): Promise<Finding[]>;
  watchFindings(auditId: string, cb: (findings: Finding[]) => void): () => void;
  createFinding(finding: NewFinding): Promise<string>;
  listActions(): Promise<CorrectiveAction[]>;
  createAction(action: NewAction): Promise<string>;
  updateAction(id: string, patch: Partial<Pick<CorrectiveAction, 'status' | 'owner' | 'dueDate'>>): Promise<void>;
  exportCsv(auditId?: string): Promise<string>;
  triggerOverdueCheck(today?: string): Promise<number>;
}

export interface SessionUser {
  email: string;
  role: 'auditor' | 'manager' | 'viewer';
}

export interface AuthService {
  signIn(email: string, password: string): Promise<SessionUser>;
  signOut(): Promise<void>;
  onChange(cb: (user: SessionUser | null) => void): () => void;
}
