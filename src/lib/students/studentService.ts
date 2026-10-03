import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy
} from "firebase/firestore";
import { db, isDemoMode } from "../firebase/config";
import { Student, StudentFormData, StudentStatus } from "@/types/student";
import { SAMPLE_STUDENTS } from "../utils/seedData";

const COLLECTION_NAME = "students";
const LOCAL_STORAGE_KEY = "smartattend_local_students";

// Local storage helpers for seamless offline/demo mode testing
function getLocalStudents(): Student[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalStudents(students: Student[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(students));
  } catch {}
}

export function clearLocalStudentCache(): void {
  saveLocalStudents([]);
}

/**
 * Fetch all students from Firestore with local fallback.
 * When Firestore is reachable, its state is authoritative — including when empty.
 * This prevents stale localStorage from showing ghost records after manual Firestore deletions.
 */
export async function getStudents(): Promise<Student[]> {
  let firestoreReachable = false;
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    firestoreReachable = true;
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as Student);
      list.sort((a, b) => a.studentId.localeCompare(b.studentId));
      // Keep local cache in sync with real Firestore state
      saveLocalStudents(list);
      return list;
    }
    // Firestore is reachable but collection is genuinely empty — trust it.
    // Clear stale local cache so manually-deleted records don't re-appear as ghosts.
    saveLocalStudents([]);
    return [];
  } catch (err: any) {
    console.warn("Firestore getStudents error:", err);
    if (err?.code === "permission-denied") {
      throw new Error(
        "Permission denied reading student records. Check Firestore security rules in Firebase Console."
      );
    }
  }

  // Firestore was unreachable (e.g. offline) — use local cache for offline support
  return getLocalStudents();
}

/**
 * Fetch a single student by studentId.
 * Firestore's authoritative "not found" is trusted — only falls back to local
 * cache when Firestore itself is unreachable (network/permissions error).
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  const id = studentId.trim().toUpperCase();
  let firestoreReachable = false;
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    firestoreReachable = true;
    // Firestore responded — trust its answer (exists or not)
    if (snap.exists()) {
      return snap.data() as Student;
    }
    // Document genuinely doesn't exist in Firestore — return null (not a local fallback)
    return null;
  } catch (err) {
    console.debug("Firestore getStudentById fallback:", err);
  }

  // Only use local cache as fallback when Firestore was unreachable
  if (!firestoreReachable) {
    const local = getLocalStudents();
    return local.find((s) => s.studentId.toUpperCase() === id) || null;
  }
  return null;
}

/**
 * Lookup student by QR Code value or Student ID
 */
export async function getStudentByQrCode(qrValue: string): Promise<Student | null> {
  const cleanQr = qrValue.trim();
  const upperQr = cleanQr.toUpperCase();

  try {
    const colRef = collection(db, COLLECTION_NAME);
    // 1. Check exact qrCodeValue
    const q1 = query(colRef, where("qrCodeValue", "==", cleanQr));
    const snap1 = await getDocs(q1);
    if (!snap1.empty) {
      return snap1.docs[0].data() as Student;
    }

    // 2. Check uppercase qrCodeValue
    const q2 = query(colRef, where("qrCodeValue", "==", upperQr));
    const snap2 = await getDocs(q2);
    if (!snap2.empty) {
      return snap2.docs[0].data() as Student;
    }

    // 3. Check doc ID directly (studentId)
    const docRef = doc(db, COLLECTION_NAME, upperQr);
    const snap3 = await getDoc(docRef);
    if (snap3.exists()) {
      return snap3.data() as Student;
    }
  } catch (err) {
    console.debug("Firestore getStudentByQrCode fallback:", err);
  }

  const local = getLocalStudents();
  return (
    local.find(
      (s) =>
        s.qrCodeValue.toLowerCase() === cleanQr.toLowerCase() ||
        s.studentId.toUpperCase() === upperQr
    ) || null
  );
}

/**
 * Add a new student. Validates for duplicate student ID.
 * Throws a user-visible error if the Firestore write fails.
 */
export async function addStudent(formData: StudentFormData): Promise<Student> {
  const studentId = formData.studentId.trim().toUpperCase();
  const existing = await getStudentById(studentId);
  if (existing) {
    throw new Error(`Student with ID "${studentId}" already exists.`);
  }

  const email = formData.email?.trim();
  if (!email) {
    throw new Error("Student email address is required for notifications.");
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Please enter a valid email address (e.g., student@example.com).");
  }

  const qrCodeValue = formData.qrCodeValue?.trim() || studentId;
  const now = new Date().toISOString();

  // Resolve classIds and classDisplayNames
  const classIds = formData.classIds && formData.classIds.length > 0
    ? formData.classIds
    : [formData.class ? formData.class.trim().toLowerCase().replace(/\s+/g, "-") : "grade-10"];

  const classDisplayNames = formData.classDisplayNames && formData.classDisplayNames.length > 0
    ? formData.classDisplayNames
    : [formData.class || "Grade 10"];

  const primaryClass = classDisplayNames[0] || formData.class || "Grade 10";

  const newStudent: Student = {
    studentId,
    fullName: formData.fullName.trim(),
    class: primaryClass,
    classIds,
    classDisplayNames,
    email,
    phone: formData.phone?.trim() || "",
    photoUrl: formData.photoUrl?.trim() || "",
    qrCodeValue,
    status: formData.status || "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  // Write to Firestore — errors are surfaced visibly, not swallowed
  try {
    const docRef = doc(db, COLLECTION_NAME, studentId);
    await setDoc(docRef, newStudent);
  } catch (err: any) {
    console.error("Firestore addStudent error:", err);
    throw new Error(
      err?.code === "permission-denied"
        ? "Permission denied. Check Firestore security rules."
        : `Failed to save student to database: ${err?.message || "Unknown error"}`
    );
  }

  // Update local cache to include the newly saved student
  const local = getLocalStudents();
  const filtered = local.filter((s) => s.studentId.toUpperCase() !== studentId);
  filtered.push(newStudent);
  saveLocalStudents(filtered);

  return newStudent;
}

/**
 * Update existing student details.
 */
export async function updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
  const id = studentId.trim().toUpperCase();
  const now = new Date().toISOString();

  if (data.email !== undefined) {
    const email = data.email.trim();
    if (!email) {
      throw new Error("Student email address is required.");
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error("Please enter a valid email address (e.g., student@example.com).");
    }
    data.email = email;
  }

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await updateDoc(docRef, { ...data, updatedAt: now });
  } catch (err) {
    console.debug("Firestore updateStudent fallback to local:", err);
  }

  const local = getLocalStudents();
  const idx = local.findIndex((s) => s.studentId.toUpperCase() === id);
  if (idx !== -1) {
    local[idx] = { ...local[idx], ...data, updatedAt: now };
    saveLocalStudents(local);
  }
}

/**
 * Returns all active students who are missing an email or have an invalid email.
 */
export async function getStudentsMissingEmail(): Promise<Student[]> {
  const students = await getStudents();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return students.filter(
    (s) => !s.email || !s.email.trim() || !emailRegex.test(s.email.trim())
  );
}

/**
 * Deactivate or activate a student.
 */
export async function toggleStudentStatus(studentId: string, status: StudentStatus): Promise<void> {
  await updateStudent(studentId, { status });
}

/**
 * Delete a student record.
 */
export async function deleteStudent(studentId: string): Promise<void> {
  const id = studentId.trim().toUpperCase();
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await deleteDoc(docRef);
  } catch (err) {
    console.debug("Firestore deleteStudent fallback:", err);
  }

  const local = getLocalStudents();
  const filtered = local.filter((s) => s.studentId.toUpperCase() !== id);
  saveLocalStudents(filtered);
}

/**
 * Seed initial sample students.
 */
export async function seedSampleStudents(): Promise<number> {
  const now = new Date().toISOString();
  let count = 0;

  for (const item of SAMPLE_STUDENTS) {
    const student: Student = {
      ...item,
      createdAt: now,
      updatedAt: now,
    };

    try {
      const docRef = doc(db, COLLECTION_NAME, student.studentId);
      await setDoc(docRef, student);
    } catch {}
    count++;
  }

  // Update local storage
  const localList: Student[] = SAMPLE_STUDENTS.map((s) => ({
    ...s,
    createdAt: now,
    updatedAt: now,
  }));
  saveLocalStudents(localList);

  return count;
}

/**
 * Clear all students.
 */
export async function clearAllStudents(): Promise<void> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    for (const d of snap.docs) {
      await deleteDoc(d.ref);
    }
  } catch {}

  saveLocalStudents([]);
}
