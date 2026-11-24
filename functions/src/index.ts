import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError, type CallableRequest } from 'firebase-functions/v2/https';
import { findingsCsv, planOverdueCheck, scoreFinding } from './logic';
import type { CorrectiveAction, Finding } from '../../shared/types';

initializeApp();
const db = getFirestore();
const REGION = 'europe-west3';

/** onCreate finding: compute a risk score from severity and repeats of the category at the same audit site. */
export const onFindingCreated = onDocumentCreated({ document: 'findings/{findingId}', region: REGION }, async (event) => {
  const snap = event.data;
  if (!snap) return;
  const finding = snap.data() as Finding;
  if (typeof finding.riskScore === 'number') return; // seeded data is already scored
  const audit = await db.collection('audits').doc(finding.auditId).get();
  const site = audit.get('site') as string | undefined;
  const auditIds = site
    ? (await db.collection('audits').where('site', '==', site).get()).docs.map((d) => d.id)
    : [finding.auditId];
  let repeats = 0;
  const sameCategory = await db.collection('findings').where('category', '==', finding.category).get();
  for (const d of sameCategory.docs) if (d.id !== snap.id && auditIds.includes(d.get('auditId'))) repeats++;
  await snap.ref.update(scoreFinding(finding.severity, repeats));
});

async function runOverdueCheck(today: string): Promise<number> {
  const open = await db.collection('actions').get();
  const actions = open.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CorrectiveAction, 'id'>) }));
  const updates = planOverdueCheck(actions, today);
  const batch = db.batch();
  for (const u of updates) batch.update(db.collection('actions').doc(u.id), { overdue: u.overdue });
  if (updates.length) await batch.commit();
  return updates.length;
}

/** Daily overdue check. The emulator does not fire schedules on its own, see triggerOverdueCheck. */
export const overdueActionCheck = onSchedule({ schedule: 'every day 06:00', timeZone: 'Europe/Berlin', region: REGION }, async () => {
  await runOverdueCheck(new Date().toISOString().slice(0, 10));
});

function requireRole(req: CallableRequest, roles: string[]) {
  if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.');
  const role = (req.auth.token.role as string | undefined) ?? 'viewer';
  if (!roles.includes(role)) throw new HttpsError('permission-denied', 'Not allowed for this role.');
}

/** Manual trigger for the same overdue logic (managers only), used in the demo and in e2e tests. */
export const triggerOverdueCheck = onCall({ region: REGION }, async (req) => {
  requireRole(req, ['manager']);
  const today = typeof req.data?.today === 'string' ? req.data.today : new Date().toISOString().slice(0, 10);
  return { updated: await runOverdueCheck(today) };
});

/** Callable CSV export of findings, optionally for one audit. */
export const exportFindingsCsv = onCall({ region: REGION }, async (req) => {
  requireRole(req, ['auditor', 'manager', 'viewer']);
  let q: FirebaseFirestore.Query = db.collection('findings');
  if (typeof req.data?.auditId === 'string') q = q.where('auditId', '==', req.data.auditId);
  const snap = await q.get();
  const findings = snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Finding, 'id'>) }));
  return { csv: findingsCsv(findings), rows: findings.length };
});
