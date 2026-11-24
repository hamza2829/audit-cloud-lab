import { readFileSync } from 'node:fs';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import { assertFails, assertSucceeds, initializeTestEnvironment, type RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { deleteDoc, doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

let env: RulesTestEnvironment;
const [host, port] = (process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080').split(':');

const audit = {
  title: 'Safety walk 1', typeId: 'safety', site: 'Aachen Plant 1', auditor: 'auditor@demo.test',
  plannedDate: '2026-12-01', status: 'planned', checklist: [],
};
const finding = {
  auditId: 'a1', title: 'Guard missing', description: '', severity: 'high', category: 'Maintenance',
  imageDataUrl: null, createdAt: '2026-12-01T10:00:00.000Z', createdBy: 'auditor@demo.test',
};
const action = { findingId: 'f1', auditId: 'a1', title: 'Fix guard', owner: 'Maintenance team', dueDate: '2026-12-15', status: 'open' };

const as = (role: string) => env.authenticatedContext(`${role}-uid`, { role, email: `${role}@demo.test` }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-audit-cloud',
    firestore: { rules: readFileSync('firebase/firestore.rules', 'utf8'), host: host!, port: Number(port) },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'audits/a1'), audit);
    await setDoc(doc(db, 'findings/f1'), { ...finding, riskScore: 60, riskBand: 'high' });
    await setDoc(doc(db, 'actions/x1'), { ...action, overdue: false });
    await setDoc(doc(db, 'auditTypes/safety'), { name: 'Safety', checklist: [] });
  });
});

describe('audits', () => {
  it('denies anonymous reads', async () => {
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'audits/a1')));
  });
  it('allows any signed-in role to read', async () => {
    await assertSucceeds(getDoc(doc(as('viewer'), 'audits/a1')));
  });
  it('denies viewers creating audits', async () => {
    await assertFails(setDoc(doc(as('viewer'), 'audits/a2'), audit));
  });
  it('allows auditors creating valid audits', async () => {
    await assertSucceeds(setDoc(doc(as('auditor'), 'audits/a2'), audit));
  });
  it('rejects malformed dates and statuses', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'audits/a3'), { ...audit, plannedDate: '01.12.2026' }));
    await assertFails(setDoc(doc(as('auditor'), 'audits/a4'), { ...audit, status: 'archived' }));
  });
  it('blocks changing the audit type after creation', async () => {
    await assertSucceeds(updateDoc(doc(as('auditor'), 'audits/a1'), { status: 'in_progress' }));
    await assertFails(updateDoc(doc(as('auditor'), 'audits/a1'), { typeId: 'supplier' }));
  });
  it('allows only managers to delete', async () => {
    await assertFails(deleteDoc(doc(as('auditor'), 'audits/a1')));
    await assertSucceeds(deleteDoc(doc(as('manager'), 'audits/a1')));
  });
});

describe('findings', () => {
  it('allows auditors to add a valid finding', async () => {
    await assertSucceeds(setDoc(doc(as('auditor'), 'findings/f2'), finding));
  });
  it('rejects client-set risk scores', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'findings/f3'), { ...finding, riskScore: 1 }));
  });
  it('requires createdBy to match the signed-in email', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'findings/f4'), { ...finding, createdBy: 'someone@else.test' }));
  });
  it('requires the audit to exist', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'findings/f5'), { ...finding, auditId: 'missing' }));
  });
  it('rejects oversized images and invalid severities', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'findings/f6'), { ...finding, imageDataUrl: `data:image/png;base64,${'A'.repeat(220_000)}` }));
    await assertFails(setDoc(doc(as('auditor'), 'findings/f7'), { ...finding, severity: 'extreme' }));
  });
  it('protects the server-computed risk score on update', async () => {
    await assertSucceeds(updateDoc(doc(as('auditor'), 'findings/f1'), { severity: 'critical' }));
    await assertFails(updateDoc(doc(as('auditor'), 'findings/f1'), { riskScore: 0 }));
  });
});

describe('actions and other collections', () => {
  it('creates actions only as open and without the overdue flag', async () => {
    await assertSucceeds(setDoc(doc(as('auditor'), 'actions/x2'), action));
    await assertFails(setDoc(doc(as('auditor'), 'actions/x3'), { ...action, status: 'done' }));
    await assertFails(setDoc(doc(as('auditor'), 'actions/x4'), { ...action, overdue: false }));
  });
  it('lets auditors close actions but not touch the overdue flag', async () => {
    await assertSucceeds(updateDoc(doc(as('auditor'), 'actions/x1'), { status: 'done' }));
    await assertFails(updateDoc(doc(as('auditor'), 'actions/x1'), { overdue: true }));
    await assertFails(updateDoc(doc(as('viewer'), 'actions/x1'), { status: 'done' }));
  });
  it('restricts audit type templates to managers', async () => {
    await assertFails(setDoc(doc(as('auditor'), 'auditTypes/new'), { name: 'X', checklist: [] }));
    await assertSucceeds(setDoc(doc(as('manager'), 'auditTypes/new'), { name: 'X', checklist: [] }));
  });
  it('denies unknown collections', async () => {
    await assertFails(setDoc(doc(as('manager'), 'secrets/x'), { a: 1 }));
    await assertFails(getDoc(doc(as('manager'), 'secrets/x')));
  });
});
