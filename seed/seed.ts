/**
 * Seeds the local Firebase emulators (never a real project).
 * Requires FIRESTORE_EMULATOR_HOST and FIREBASE_AUTH_EMULATOR_HOST, which
 * `firebase emulators:exec` sets automatically. Refuses to run without them.
 */
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { generateSeed } from '../shared/seedData';

export const DEMO_USERS = [
  { email: 'auditor@demo.test', password: 'demo-password', role: 'auditor', displayName: 'Ada Auditor' },
  { email: 'manager@demo.test', password: 'demo-password', role: 'manager', displayName: 'Max Manager' },
  { email: 'viewer@demo.test', password: 'demo-password', role: 'viewer', displayName: 'Vera Viewer' },
];

async function main() {
  if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
    throw new Error('Emulator hosts not set. Run through `firebase emulators:exec` or `npm run e2e:emu`.');
  }
  initializeApp({ projectId: 'demo-audit-cloud' });
  const db = getFirestore();
  const auth = getAuth();
  const t0 = Date.now();

  for (const u of DEMO_USERS) {
    let uid: string;
    try {
      uid = (await auth.getUserByEmail(u.email)).uid;
    } catch {
      uid = (await auth.createUser({ email: u.email, password: u.password, displayName: u.displayName })).uid;
    }
    await auth.setCustomUserClaims(uid, { role: u.role });
  }

  const data = generateSeed({ seed: 42, today: process.env.SEED_TODAY ?? new Date().toISOString().slice(0, 10) });
  const writes: [string, { id: string }][] = [
    ...data.auditTypes.map((d) => ['auditTypes', d] as [string, { id: string }]),
    ...data.audits.map((d) => ['audits', d] as [string, { id: string }]),
    ...data.findings.map((d) => ['findings', d] as [string, { id: string }]),
    ...data.actions.map((d) => ['actions', d] as [string, { id: string }]),
  ];
  for (let i = 0; i < writes.length; i += 400) {
    const batch = db.batch();
    for (const [col, doc] of writes.slice(i, i + 400)) {
      const { id, ...rest } = doc;
      batch.set(db.collection(col).doc(id), rest);
    }
    await batch.commit();
  }
  console.log(
    `seeded ${data.auditTypes.length} audit types, ${data.audits.length} audits, ${data.findings.length} findings, ` +
      `${data.actions.length} actions, ${DEMO_USERS.length} users in ${Date.now() - t0} ms`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
