import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { ClassEntity, ClassScheduleEntry, DayOfWeek } from "@/types/class";

const COLLECTION_NAME = "classes";
const LOCAL_STORAGE_KEY = "smartattend_local_classes";

export const DEFAULT_INITIAL_CLASSES: ClassEntity[] = [
  {
    id: "grade-1",
    name: "Grade 1",
    schedules: [
      { id: "g1-mon", dayOfWeek: "Monday", startTime: "08:30", endTime: "13:30" },
      { id: "g1-wed", dayOfWeek: "Wednesday", startTime: "08:30", endTime: "13:30" },
      { id: "g1-fri", dayOfWeek: "Friday", startTime: "08:30", endTime: "13:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-2",
    name: "Grade 2",
    schedules: [
      { id: "g2-mon", dayOfWeek: "Monday", startTime: "08:30", endTime: "13:30" },
      { id: "g2-wed", dayOfWeek: "Wednesday", startTime: "08:30", endTime: "13:30" },
      { id: "g2-fri", dayOfWeek: "Friday", startTime: "08:30", endTime: "13:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-3",
    name: "Grade 3",
    schedules: [
      { id: "g3-tue", dayOfWeek: "Tuesday", startTime: "08:30", endTime: "13:30" },
      { id: "g3-thu", dayOfWeek: "Thursday", startTime: "08:30", endTime: "13:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-4",
    name: "Grade 4",
    schedules: [
      { id: "g4-tue", dayOfWeek: "Tuesday", startTime: "08:30", endTime: "13:30" },
      { id: "g4-thu", dayOfWeek: "Thursday", startTime: "08:30", endTime: "13:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-5",
    name: "Grade 5",
    schedules: [
      { id: "g5-mon", dayOfWeek: "Monday", startTime: "08:30", endTime: "14:00" },
      { id: "g5-wed", dayOfWeek: "Wednesday", startTime: "08:30", endTime: "14:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-6",
    name: "Grade 6",
    schedules: [
      { id: "g6-sat", dayOfWeek: "Saturday", startTime: "19:00", endTime: "21:00" },
      { id: "g6-tue", dayOfWeek: "Tuesday", startTime: "16:00", endTime: "18:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-7",
    name: "Grade 7",
    schedules: [
      { id: "g7-sun", dayOfWeek: "Sunday", startTime: "09:00", endTime: "11:00" },
      { id: "g7-wed", dayOfWeek: "Wednesday", startTime: "16:00", endTime: "18:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-8",
    name: "Grade 8",
    schedules: [
      { id: "g8-sat", dayOfWeek: "Saturday", startTime: "15:00", endTime: "17:00" },
      { id: "g8-thu", dayOfWeek: "Thursday", startTime: "16:00", endTime: "18:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-9",
    name: "Grade 9",
    schedules: [
      { id: "g9-sun", dayOfWeek: "Sunday", startTime: "14:00", endTime: "16:00" },
      { id: "g9-fri", dayOfWeek: "Friday", startTime: "16:00", endTime: "18:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-10",
    name: "Grade 10",
    schedules: [
      { id: "g10-sat", dayOfWeek: "Saturday", startTime: "08:00", endTime: "10:30" },
      { id: "g10-mon", dayOfWeek: "Monday", startTime: "16:00", endTime: "18:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-11",
    name: "Grade 11",
    schedules: [
      { id: "g11-sun", dayOfWeek: "Sunday", startTime: "08:00", endTime: "10:30" },
      { id: "g11-wed", dayOfWeek: "Wednesday", startTime: "17:00", endTime: "19:30" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: "grade-12",
    name: "Grade 12",
    schedules: [
      { id: "g12-sat", dayOfWeek: "Saturday", startTime: "11:00", endTime: "14:00" },
      { id: "g12-sun", dayOfWeek: "Sunday", startTime: "11:00", endTime: "14:00" },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function getLocalClasses(): ClassEntity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveLocalClasses(list: ClassEntity[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

/**
 * Fetch all classes and their schedule configurations.
 * When Firestore is reachable, its state is authoritative — including when empty.
 * Falls back to localStorage only when Firestore is unreachable (network error).
 * If empty everywhere, auto-seeds defaults.
 */
export async function getClasses(): Promise<ClassEntity[]> {
  let firestoreReachable = false;
  try {
    const colRef = collection(db, COLLECTION_NAME);
    const snap = await getDocs(colRef);
    firestoreReachable = true;
    if (!snap.empty) {
      const list = snap.docs.map((d) => d.data() as ClassEntity);
      list.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
      saveLocalClasses(list);
      return list;
    }
    // Firestore is reachable but empty — clear stale local cache
    saveLocalClasses([]);
  } catch (err) {
    console.debug("Firestore getClasses fallback:", err);
  }

  if (!firestoreReachable) {
    // Offline — use local cache
    const local = getLocalClasses();
    if (local.length > 0) {
      return local.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    }
  }

  // Nothing in Firestore or local — auto-initialize defaults
  await initializeDefaultClasses();
  return DEFAULT_INITIAL_CLASSES;
}

/**
 * Find class by exact name or ID (case-insensitive)
 */
export async function getClassByName(className: string): Promise<ClassEntity | null> {
  const classes = await getClasses();
  const search = className.trim().toLowerCase();
  return (
    classes.find(
      (c) => c.name.toLowerCase() === search || c.id.toLowerCase() === search
    ) || null
  );
}

/**
 * Create or update a class and its schedules.
 */
export async function saveClass(
  classData: {
    id?: string;
    name: string;
    schedules: ClassScheduleEntry[];
    createdAt?: string;
    updatedAt?: string;
  }
): Promise<ClassEntity> {
  const now = new Date().toISOString();
  const id = classData.id || classData.name.toLowerCase().replace(/\s+/g, "-");

  const fullEntity: ClassEntity = {
    id,
    name: classData.name.trim(),
    schedules: classData.schedules || [],
    createdAt: classData.createdAt || now,
    updatedAt: now,
  };

  try {
    const docRef = doc(db, COLLECTION_NAME, id);
    await setDoc(docRef, fullEntity);
  } catch (err) {
    console.debug("Firestore saveClass fallback:", err);
  }

  const local = getLocalClasses();
  const idx = local.findIndex((c) => c.id === id);
  if (idx !== -1) {
    local[idx] = fullEntity;
  } else {
    local.push(fullEntity);
  }
  saveLocalClasses(local);

  return fullEntity;
}

/**
 * Delete a class
 */
export async function deleteClass(classId: string): Promise<void> {
  try {
    const docRef = doc(db, COLLECTION_NAME, classId);
    await deleteDoc(docRef);
  } catch (err) {
    console.debug("Firestore deleteClass fallback:", err);
  }

  const local = getLocalClasses();
  const filtered = local.filter((c) => c.id !== classId);
  saveLocalClasses(filtered);
}

/**
 * Seed initial default classes
 */
export async function initializeDefaultClasses(): Promise<void> {
  for (const c of DEFAULT_INITIAL_CLASSES) {
    try {
      const docRef = doc(db, COLLECTION_NAME, c.id);
      await setDoc(docRef, c);
    } catch {}
  }
  saveLocalClasses(DEFAULT_INITIAL_CLASSES);
}
