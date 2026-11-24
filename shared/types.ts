export type Severity = 'low' | 'medium' | 'high' | 'critical';
export type AuditStatus = 'planned' | 'in_progress' | 'closed';
export type ChecklistResult = 'ok' | 'nok' | 'na' | null;
export type ActionStatus = 'open' | 'done';
export type Role = 'auditor' | 'manager' | 'viewer';

export const SEVERITIES: Severity[] = ['low', 'medium', 'high', 'critical'];
export const AUDIT_STATUSES: AuditStatus[] = ['planned', 'in_progress', 'closed'];

export interface ChecklistTemplateItem {
  id: string;
  text: string;
}

export interface AuditType {
  id: string;
  name: string;
  checklist: ChecklistTemplateItem[];
}

export interface ChecklistItem extends ChecklistTemplateItem {
  result: ChecklistResult;
}

export interface Audit {
  id: string;
  title: string;
  typeId: string;
  site: string;
  auditor: string;
  plannedDate: string; // YYYY-MM-DD
  status: AuditStatus;
  checklist: ChecklistItem[];
}

export interface Finding {
  id: string;
  auditId: string;
  title: string;
  description: string;
  severity: Severity;
  category: string;
  imageDataUrl?: string | null;
  riskScore?: number | null;
  riskBand?: string | null;
  createdAt: string; // ISO timestamp
  createdBy: string;
}

export interface CorrectiveAction {
  id: string;
  findingId: string;
  auditId: string;
  title: string;
  owner: string;
  dueDate: string; // YYYY-MM-DD
  status: ActionStatus;
  overdue?: boolean;
}
