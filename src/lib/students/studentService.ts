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

/**
 * Fetch all students from Firestore with local fallback.
 */
export async function getStudents(): Promise<Student[]> {
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as Student);
      list.sort((a, b) => a.studentId.localeCompare(b.studentId));
      return list;
    }
  } catch (err) {
    console.debug("Firestore getStudents fallback to local:", err);
  }

  const local = getLocalStudents();
  if (local.length > 0) return local;

  // Auto-seed in demo mode
  if (isDemoMode) {
    const initial: Student[] = SAMPLE_STUDENTS.map((s) => ({
      ...s,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));
    saveLocalStudents(initial);
    return initial;
  }

  return [];
}

/**
 * Fetch a single student by studentId
 */
export async function getStudentById(studentId: string): Promise<Student | null> {
  const id = studentId.trim().toUpperCase();
  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as Student;
    }
  } catch (err) {
    console.debug("Firestore getStudentById fallback:", err);
  }

  const local = getLocalStudents();
  return local.find((s) => s.studentId.toUpperCase() === id) || null;
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
 */
export async function addStudent(formData: StudentFormData): Promise<Student> {
  const studentId = formData.studentId.trim().toUpperCase();
  const existing = await getStudentById(studentId);
  if (existing) {
    throw new Error(`Student with ID "${studentId}" already exists.`);
  }

  const qrCodeValue = formData.qrCodeValue?.trim() || studentId;
  const now = new Date().toISOString();

  const newStudent: Student = {
    studentId,
    fullName: formData.fullName.trim(),
    class: formData.class.trim(),
    section: formData.section.trim(),
    email: formData.email?.trim() || "",
    phone: formData.phone?.trim() || "",
    photoUrl: formData.photoUrl?.trim() || "",
    qrCodeValue,
    status: formData.status || "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, studentId);
    await setDoc(docRef, newStudent);
  } catch (err) {
    console.debug("Firestore addStudent fallback to local:", err);
  }

  const local = getLocalStudents();
  local.push(newStudent);
  saveLocalStudents(local);

  return newStudent;
}

/**
 * Update existing student details.
 */
export async function updateStudent(studentId: string, data: Partial<Student>): Promise<void> {
  const id = studentId.trim().toUpperCase();
  const now = new Date().toISOString();

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
