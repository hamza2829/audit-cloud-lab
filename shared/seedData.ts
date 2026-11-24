import type { Audit, AuditType, CorrectiveAction, Finding, Severity } from './types';
import { mulberry32, pick } from './rng';
import { addDays } from './dates';
import { riskBand, riskScore } from './risk';

export const AUDIT_TYPES: AuditType[] = [
  {
    id: 'iso9001',
    name: 'ISO 9001 process audit',
    checklist: [
      { id: 'q1', text: 'Work instructions are current and available at the station' },
      { id: 'q2', text: 'Measuring equipment is calibrated and labelled' },
      { id: 'q3', text: 'Nonconforming parts are segregated and tagged' },
      { id: 'q4', text: 'Operators are trained for the process step' },
      { id: 'q5', text: 'Records are complete and signed' },
    ],
  },
  {
    id: 'safety',
    name: 'Workplace safety walk',
    checklist: [
      { id: 's1', text: 'Escape routes and fire extinguishers are unobstructed' },
      { id: 's2', text: 'Required PPE is worn' },
      { id: 's3', text: 'Machine guards are in place' },
      { id: 's4', text: 'Hazardous substances are labelled and stored correctly' },
    ],
  },
  {
    id: 'supplier',
    name: 'Supplier audit',
    checklist: [
      { id: 'p1', text: 'Incoming inspection plan exists and is followed' },
      { id: 'p2', text: 'Certificates of conformity are on file' },
      { id: 'p3', text: 'Traceability from batch to delivery is possible' },
      { id: 'p4', text: 'Corrective actions from last audit are closed' },
      { id: 'p5', text: 'Packaging protects parts from damage' },
      { id: 'p6', text: 'Change notifications are sent before process changes' },
    ],
  },
];

export const SITES = ['Aachen Plant 1', 'Aachen Plant 2', 'Cologne Warehouse', 'Düren Supplier Park'];
export const AUDITORS = ['auditor@demo.test', 'manager@demo.test'];
export const OWNERS = ['Maintenance team', 'Quality lead', 'Shift supervisor', 'Purchasing', 'HSE officer'];

/** Phrase banks per category. Categories double as the recurring root cause the AI helper should find. */
export const CATEGORY_PHRASES: Record<string, string[]> = {
  Calibration: [
    'Calibration of {equip} expired',
    'No calibration label on {equip}',
    '{equip} used past its calibration due date',
    'Calibration certificate for {equip} missing',
  ],
  Documentation: [
    'Work instruction at {station} is an outdated revision',
    'Inspection record at {station} not signed',
    'Batch record incomplete at {station}',
    'Obsolete document still posted at {station}',
  ],
  Training: [
    'Operator at {station} not trained on current procedure',
    'Training record missing for new employee at {station}',
    'Qualification matrix not updated for {station}',
  ],
  Housekeeping: [
    'Escape route blocked by pallets near {station}',
    'Oil spill not cleaned up at {station}',
    'Scrap bins overflowing at {station}',
  ],
  PPE: [
    'Safety glasses not worn at {station}',
    'Hearing protection missing at {station}',
    'Gloves not used while handling sharp parts at {station}',
  ],
  Labelling: [
    'Nonconforming parts not tagged at {station}',
    'Chemical container without hazard label at {station}',
    'Material label unreadable at {station}',
  ],
  Maintenance: [
    'Machine guard loose on {equip}',
    'Preventive maintenance overdue for {equip}',
    'Hydraulic leak on {equip}',
  ],
};

const EQUIPMENT = ['torque wrench TW-12', 'caliper C-07', 'press P-3', 'gauge G-21', 'scale S-4', 'CNC mill M-2'];
const STATIONS = ['assembly line 1', 'assembly line 2', 'paint shop', 'goods receipt', 'test bay', 'packing area'];
const SEVERITY_DIST: Severity[] = ['low', 'low', 'low', 'medium', 'medium', 'medium', 'high', 'high', 'critical'];

export interface SeedData {
  auditTypes: AuditType[];
  audits: Audit[];
  findings: Finding[];
  actions: CorrectiveAction[];
}

export interface SeedOptions {
  seed?: number;
  audits?: number;
  findings?: number;
  today?: string;
}

export function generateSeed(opts: SeedOptions = {}): SeedData {
  const rand = mulberry32(opts.seed ?? 42);
  const nAudits = opts.audits ?? 40;
  const nFindings = opts.findings ?? 300;
  const today = opts.today ?? '2026-11-24';

  const audits: Audit[] = [];
  for (let i = 0; i < nAudits; i++) {
    const type = AUDIT_TYPES[i % AUDIT_TYPES.length]!;
    const plannedDate = addDays(today, Math.floor(rand() * 120) - 90);
    const status = plannedDate < addDays(today, -14) ? 'closed' : plannedDate <= today ? 'in_progress' : 'planned';
    audits.push({
      id: `audit-${String(i + 1).padStart(3, '0')}`,
      title: `${type.name} #${i + 1}`,
      typeId: type.id,
      site: pick(rand, SITES),
      auditor: pick(rand, AUDITORS),
      plannedDate,
      status,
      checklist: type.checklist.map((c) => ({
        ...c,
        result: status === 'planned' ? null : rand() < 0.22 ? 'nok' : rand() < 0.08 ? 'na' : 'ok',
      })),
    });
  }

  const categories = Object.keys(CATEGORY_PHRASES);
  const executed = audits.filter((a) => a.status !== 'planned');
  const repeats = new Map<string, number>();
  const findings: Finding[] = [];
  for (let i = 0; i < nFindings; i++) {
    const audit = pick(rand, executed);
    const category = pick(rand, categories);
    const title = pick(rand, CATEGORY_PHRASES[category]!)
      .replace('{equip}', pick(rand, EQUIPMENT))
      .replace('{station}', pick(rand, STATIONS));
    const severity = pick(rand, SEVERITY_DIST);
    const key = `${audit.site}|${category}`;
    const seen = repeats.get(key) ?? 0;
    repeats.set(key, seen + 1);
    const score = riskScore(severity, seen);
    findings.push({
      id: `finding-${String(i + 1).padStart(3, '0')}`,
      auditId: audit.id,
      title,
      description: `${title}. Observed during ${audit.title} at ${audit.site}.`,
      severity,
      category,
      imageDataUrl: null,
      riskScore: score,
      riskBand: riskBand(score),
      createdAt: `${audit.plannedDate}T10:00:00.000Z`,
      createdBy: audit.auditor,
    });
  }

  const actions: CorrectiveAction[] = [];
  for (const f of findings) {
    if (f.severity === 'low') continue;
    const audit = audits.find((a) => a.id === f.auditId)!;
    const dueDate = addDays(audit.plannedDate, 14 + Math.floor(rand() * 30));
    const status = rand() < 0.55 ? 'done' : 'open';
    actions.push({
      id: `action-${String(actions.length + 1).padStart(3, '0')}`,
      findingId: f.id,
      auditId: f.auditId,
      title: `Fix: ${f.title}`,
      owner: pick(rand, OWNERS),
      dueDate,
      status,
      overdue: false,
    });
  }

  return { auditTypes: AUDIT_TYPES, audits, findings, actions };
}
