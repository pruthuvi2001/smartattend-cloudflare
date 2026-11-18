/**
 * Admin-only student maintenance:
 *  - changeStudentId():         fix a wrong / changed Student ID and move all of that
 *                               student's attendance + fee history to the new ID.
 *  - deleteStudentAndRecords(): permanently remove a student added by mistake,
 *                               together with their attendance + fee records.
 *
 * Safety rules followed here:
 *  - Nothing is removed until every copy under the new ID has been saved (ID change).
 *  - The student record itself is removed LAST, so an interrupted delete can simply be retried.
 *  - Every Firestore error is shown to the user — nothing is silently swallowed.
 *  - Firestore security rules only allow ADMIN users to delete, so the UI only offers
 *    these actions to admins.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { Student } from "@/types/student";
import { parseStudentQrPayload } from "../utils/qrUtils";

const STUDENTS = "students";
const ATTENDANCE = "attendance";
const FEES = "feeRecords";
/** Firestore allows max 500 writes per batch; stay well below it. */
const BATCH_SIZE = 400;

/** A message meant for the user (validation problems etc.). */
export class StudentAdminError extends Error {}

type DocData = Record<string, any>;
export type DocSnapshotLite = { id: string; data: DocData };

export type WriteOp =
  | { kind: "set"; col: string; id: string; data: DocData }
  | { kind: "delete"; col: string; id: string };

// ───────────────────────── pure helpers (unit-tested) ─────────────────────────

export function normalizeStudentId(raw: string): string {
  return (raw || "").trim().toUpperCase();
}

/** Returns an error message, or null when the new ID is acceptable. */
export function validateNewStudentId(oldId: string, rawNewId: string): string | null {
  const newId = normalizeStudentId(rawNewId);
  if (!newId) return "Please enter the new Student ID.";
  if (newId === normalizeStudentId(oldId)) return "The new ID is the same as the current ID.";
  if (newId.length > 40) return "Student ID is too long (max 40 characters).";
  if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(newId)) {
    return "Use only letters, numbers, dash (-), underscore (_) or dot (.) — no spaces or slashes.";
  }
  if (/^__.*__$/.test(newId)) return "This Student ID is not allowed.";
  return null;
}

/**
 * If the QR value carries the old student ID (plain ID or the default JSON
 * format {"std_ID":"..."}), return the same value with the new ID.
 * Custom QR values that do not contain the old ID are kept unchanged.
 */
export function remapQrValue(qr: string, oldId: string, newId: string): { value: string; changed: boolean } {
  const value = (qr || "").trim();
  if (!value || value.toUpperCase() === oldId) return { value: newId, changed: true };
  if (value.startsWith("{") && value.endsWith("}")) {
    try {
      const parsed = JSON.parse(value);
      let changed = false;
      for (const key of ["STD_ID", "std_ID", "studentId", "id"]) {
        if (typeof parsed[key] === "string" && parsed[key].trim().toUpperCase() === oldId) {
          parsed[key] = newId;
          changed = true;
        }
      }
      if (changed) return { value: JSON.stringify(parsed), changed: true };
    } catch {
      /* not JSON — fall through */
    }
  }
  if (normalizeStudentId(parseStudentQrPayload(value)) === oldId) {
    // e.g. a URL or key=value payload containing the old ID
    return { value: value.split(oldId).join(newId), changed: value.includes(oldId) };
  }
  return { value, changed: false };
}

/** Attendance / fee document IDs start with "<studentId>_". Returns the renamed ID, or the same ID. */
export function remapDocId(docId: string, oldId: string, newId: string): string {
  const prefix = `${oldId}_`;
  return docId.toUpperCase().startsWith(prefix) ? `${newId}${docId.slice(oldId.length)}` : docId;
}

/**
 * Build every write needed to move a student to a new ID.
 *  - additions: brand-new documents under the new ID (safe — they touch nothing existing)
 *  - finalize:  in-place updates + removal of the old documents (run only after all additions succeed)
 */
export function planStudentIdChange(
  student: Student,
  rawNewId: string,
  attendance: DocSnapshotLite[],
  fees: DocSnapshotLite[],
  nowIso: string = new Date().toISOString()
): { newStudent: Student; qrChanged: boolean; additions: WriteOp[]; finalize: WriteOp[] } {
  const oldId = normalizeStudentId(student.studentId);
  const newId = normalizeStudentId(rawNewId);
  const qr = remapQrValue(student.qrCodeValue, oldId, newId);

  const newStudent: Student = { ...student, studentId: newId, qrCodeValue: qr.value, updatedAt: nowIso };
  const additions: WriteOp[] = [{ kind: "set", col: STUDENTS, id: newId, data: newStudent }];
  const finalize: WriteOp[] = [];

  const move = (col: string, d: DocSnapshotLite, idField: string, mapData: (data: DocData, newDocId: string) => DocData) => {
    const newDocId = remapDocId(d.id, oldId, newId);
    const data = mapData({ ...d.data, studentId: newId }, newDocId);
    if (d.data[idField] === d.id) data[idField] = newDocId;
    if (newDocId === d.id) {
      finalize.push({ kind: "set", col, id: d.id, data }); // ID has no prefix: update in place
    } else {
      additions.push({ kind: "set", col, id: newDocId, data });
      finalize.push({ kind: "delete", col, id: d.id });
    }
  };

  for (const a of attendance) move(ATTENDANCE, a, "attendanceId", (data) => data);
  for (const f of fees) {
    move(FEES, f, "feeRecordId", (data, newDocId) => ({
      ...data,
      transactions: Array.isArray(data.transactions)
        ? data.transactions.map((t: DocData) => ({
            ...t,
            studentId: newId,
            feeRecordId: t.feeRecordId === f.id ? newDocId : t.feeRecordId,
          }))
        : data.transactions,
    }));
  }

  finalize.push({ kind: "delete", col: STUDENTS, id: oldId }); // old student record goes last
  return { newStudent, qrChanged: qr.changed, additions, finalize };
}

// ───────────────────────────── Firestore helpers ─────────────────────────────

async function commitOps(ops: WriteOp[]): Promise<void> {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    for (const op of ops.slice(i, i + BATCH_SIZE)) {
      const ref = doc(db, op.col, op.id);
      if (op.kind === "set") batch.set(ref, op.data);
      else batch.delete(ref);
    }
    await batch.commit();
  }
}

async function getDocsForStudent(col: string, studentId: string): Promise<DocSnapshotLite[]> {
  const snap = await getDocs(query(collection(db, col), where("studentId", "==", studentId)));
  return snap.docs.map((d) => ({ id: d.id, data: d.data() }));
}

function friendly(err: any, action: string): Error {
  if (err?.code === "permission-denied") {
    return new Error(`Permission denied — only ADMIN users can ${action}.`);
  }
  return new Error(`Could not ${action}: ${err?.message || "unknown error"}. Check the internet connection and try again.`);
}

/** Remove a student's rows from this browser's offline cache so old data never reappears. */
function purgeLocalCache(studentId: string) {
  if (typeof window === "undefined") return;
  const keys: [string, string][] = [
    ["smartattend_local_students", "studentId"],
    ["smartattend_local_attendance", "studentId"],
    ["smartattend_local_fees", "studentId"],
  ];
  for (const [key, field] of keys) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw);
      if (Array.isArray(list)) {
        localStorage.setItem(key, JSON.stringify(list.filter((r: any) => normalizeStudentId(r?.[field]) !== studentId)));
      }
    } catch {
      /* cache is optional */
    }
  }
}

// ──────────────────────────────── public API ────────────────────────────────

export interface StudentRecordCounts {
  attendance: number;
  feeRecords: number;
  payments: number;
}

export async function getStudentRecordCounts(studentId: string): Promise<StudentRecordCounts> {
  const id = normalizeStudentId(studentId);
  try {
    const [attendance, fees] = await Promise.all([getDocsForStudent(ATTENDANCE, id), getDocsForStudent(FEES, id)]);
    const payments = fees.reduce((n, f) => n + (Array.isArray(f.data.transactions) ? f.data.transactions.length : 0), 0);
    return { attendance: attendance.length, feeRecords: fees.length, payments };
  } catch (err) {
    throw friendly(err, "read this student's records");
  }
}

/**
 * Change a student's ID and move all their attendance + fee records to it.
 * Returns the updated student and whether the QR code changed (→ print a new ID card).
 */
export async function changeStudentId(
  oldStudentId: string,
  rawNewId: string
): Promise<{ student: Student; qrChanged: boolean; moved: StudentRecordCounts }> {
  const oldId = normalizeStudentId(oldStudentId);
  const newId = normalizeStudentId(rawNewId);
  const invalid = validateNewStudentId(oldId, newId);
  if (invalid) throw new StudentAdminError(invalid);

  let student: Student;
  let attendance: DocSnapshotLite[];
  let fees: DocSnapshotLite[];
  try {
    const [oldSnap, newSnap] = await Promise.all([getDoc(doc(db, STUDENTS, oldId)), getDoc(doc(db, STUDENTS, newId))]);
    if (!oldSnap.exists()) throw new StudentAdminError(`Student "${oldId}" was not found. Press "Sync & Refresh" and try again.`);
    if (newSnap.exists()) throw new StudentAdminError(`Another student already uses the ID "${newId}". Choose a different ID.`);
    student = oldSnap.data() as Student;

    // Records already stored under the new ID would be mixed with this student's — stop.
    const [leftoverAtt, leftoverFees] = await Promise.all([getDocsForStudent(ATTENDANCE, newId), getDocsForStudent(FEES, newId)]);
    if (leftoverAtt.length || leftoverFees.length) {
      throw new StudentAdminError(
        `There are already ${leftoverAtt.length} attendance and ${leftoverFees.length} fee record(s) saved under "${newId}" ` +
          `(from an older student). Choose a different ID so records are not mixed.`
      );
    }
    [attendance, fees] = await Promise.all([getDocsForStudent(ATTENDANCE, oldId), getDocsForStudent(FEES, oldId)]);
  } catch (err: any) {
    if (err instanceof StudentAdminError) throw err;
    throw friendly(err, "check the Student IDs");
  }

  const plan = planStudentIdChange(student, newId, attendance, fees);

  // QR codes must stay unique
  if (plan.qrChanged) {
    try {
      const dup = await getDocs(query(collection(db, STUDENTS), where("qrCodeValue", "==", plan.newStudent.qrCodeValue)));
      if (!dup.empty) throw new StudentAdminError(`Another student already uses the QR code "${plan.newStudent.qrCodeValue}".`);
    } catch (err: any) {
      if (err instanceof StudentAdminError) throw err;
      throw friendly(err, "check QR codes");
    }
  }

  // Step 1 — copy everything to the new ID. Nothing existing is changed yet.
  const done: WriteOp[] = [];
  try {
    for (let i = 0; i < plan.additions.length; i += BATCH_SIZE) {
      const chunk = plan.additions.slice(i, i + BATCH_SIZE);
      await commitOps(chunk);
      done.push(...chunk);
    }
  } catch (err) {
    // Undo the partial copy so the old ID stays exactly as it was.
    try {
      await commitOps(done.map((op) => ({ kind: "delete", col: op.col, id: op.id }) as WriteOp));
    } catch {
      /* best effort */
    }
    throw friendly(err, "change the Student ID (nothing was changed — the old ID still works)");
  }

  // Step 2 — everything is safely copied; now update in place and remove the old records.
  try {
    await commitOps(plan.finalize);
  } catch (err) {
    throw friendly(
      err,
      `finish removing the old ID "${oldId}". All records are already saved under "${newId}"; ` +
        `ask an admin to delete student "${oldId}" from the list`
    );
  }

  purgeLocalCache(oldId);
  const payments = fees.reduce((n, f) => n + (Array.isArray(f.data.transactions) ? f.data.transactions.length : 0), 0);
  return { student: plan.newStudent, qrChanged: plan.qrChanged, moved: { attendance: attendance.length, feeRecords: fees.length, payments } };
}

/**
 * Permanently delete a student together with their attendance and fee records.
 * The student record is removed last, so an interrupted delete can be retried.
 */
export async function deleteStudentAndRecords(studentId: string): Promise<StudentRecordCounts> {
  const id = normalizeStudentId(studentId);
  if (!id) throw new StudentAdminError("Missing Student ID.");
  try {
    const [attendance, fees] = await Promise.all([getDocsForStudent(ATTENDANCE, id), getDocsForStudent(FEES, id)]);
    const ops: WriteOp[] = [
      ...attendance.map((d) => ({ kind: "delete", col: ATTENDANCE, id: d.id }) as WriteOp),
      ...fees.map((d) => ({ kind: "delete", col: FEES, id: d.id }) as WriteOp),
      { kind: "delete", col: STUDENTS, id },
    ];
    await commitOps(ops);
    purgeLocalCache(id);
    const payments = fees.reduce((n, f) => n + (Array.isArray(f.data.transactions) ? f.data.transactions.length : 0), 0);
    return { attendance: attendance.length, feeRecords: fees.length, payments };
  } catch (err) {
    throw friendly(err, "delete this student");
  }
}
