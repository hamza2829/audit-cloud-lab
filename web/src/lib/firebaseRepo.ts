import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth, onIdTokenChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  addDoc, collection, connectFirestoreEmulator, doc, getDocs, initializeFirestore, onSnapshot, query, updateDoc, where,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions, httpsCallable } from 'firebase/functions';
import type { Audit, AuditType, CorrectiveAction, Finding } from '@shared/types';
import type { AuthService, NewAction, NewFinding, Repo, SessionUser } from './repo';

/** Demo project id: the SDK never talks to a real Google Cloud project, only to the local emulators. */
export const PROJECT_ID = 'demo-audit-cloud';
const host = (import.meta.env.VITE_EMULATOR_HOST as string | undefined) ?? '127.0.0.1';

const app = initializeApp({ apiKey: 'demo-api-key', authDomain: `${PROJECT_ID}.firebaseapp.com`, projectId: PROJECT_ID });
const auth = getAuth(app);
connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true });
const db = initializeFirestore(app, { experimentalAutoDetectLongPolling: true });
connectFirestoreEmulator(db, host, 8080);
const functions = getFunctions(app, 'europe-west3');
connectFunctionsEmulator(functions, host, 5001);

function rows<T>(snap: { docs: { id: string; data(): unknown }[] }): T[] {
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) }) as T);
}

export const firebaseRepo: Repo = {
  async listAuditTypes() { return rows<AuditType>(await getDocs(collection(db, 'auditTypes'))); },
  async listAudits() { return rows<Audit>(await getDocs(collection(db, 'audits'))); },
  async createAudit(audit) { return (await addDoc(collection(db, 'audits'), audit)).id; },
  async updateAudit(id, patch) { await updateDoc(doc(db, 'audits', id), patch); },
  async listFindings() { return rows<Finding>(await getDocs(collection(db, 'findings'))); },
  watchFindings(auditId, cb) {
    return onSnapshot(query(collection(db, 'findings'), where('auditId', '==', auditId)), (snap) => cb(rows<Finding>(snap)));
  },
  async createFinding(finding: NewFinding) { return (await addDoc(collection(db, 'findings'), finding)).id; },
  async listActions() { return rows<CorrectiveAction>(await getDocs(collection(db, 'actions'))); },
  async createAction(action: NewAction) { return (await addDoc(collection(db, 'actions'), action)).id; },
  async updateAction(id, patch) { await updateDoc(doc(db, 'actions', id), patch); },
  async exportCsv(auditId) {
    const res = await httpsCallable<{ auditId?: string }, { csv: string }>(functions, 'exportFindingsCsv')(auditId ? { auditId } : {});
    return res.data.csv;
  },
  async triggerOverdueCheck(today) {
    const res = await httpsCallable<{ today?: string }, { updated: number }>(functions, 'triggerOverdueCheck')(today ? { today } : {});
    return res.data.updated;
  },
};

export const firebaseAuth: AuthService = {
  async signIn(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const token = await cred.user.getIdTokenResult();
    return { email: cred.user.email ?? email, role: (token.claims.role as SessionUser['role'] | undefined) ?? 'viewer' };
  },
  async signOut() { await signOut(auth); },
  onChange(cb) {
    return onIdTokenChanged(auth, async (user) => {
      if (!user) return cb(null);
      const token = await user.getIdTokenResult();
      const role = (token.claims.role as SessionUser['role'] | undefined) ?? 'viewer';
      cb({ email: user.email ?? '', role });
    });
  },
};
