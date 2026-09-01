import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";

const SETTINGS_DOC_PATH = "settings/system";
const LOCAL_STORAGE_KEY = "smartattend_system_settings";

export async function getSystemSettings(): Promise<SystemSettings> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
  }

  try {
    const docRef = doc(db, "settings", "system");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as SystemSettings;
      if (typeof window !== "undefined") {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      }
      return data;
    }
  } catch (err) {
    console.debug("Firestore getSystemSettings fallback:", err);
  }

  return DEFAULT_SETTINGS;
}

export async function saveSystemSettings(settings: Partial<SystemSettings>, updatedBy: string = "Admin"): Promise<SystemSettings> {
  const current = await getSystemSettings();
  const updated: SystemSettings = {
    ...current,
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy,
  };

  try {
    const docRef = doc(db, "settings", "system");
    await setDoc(docRef, updated, { merge: true });
  } catch (err) {
    console.debug("Firestore saveSystemSettings fallback:", err);
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  return updated;
}
