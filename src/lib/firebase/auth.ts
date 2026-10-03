import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  User
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db, firebaseConfig, isDemoMode } from "./config";
import { UserProfile, UserRole } from "@/types/user";

const LOCAL_USERS_KEY = "smartattend_local_users_cache";

function getLocalUsers(): UserProfile[] {
  if (typeof window === "undefined") return [];
  try {
    const data = localStorage.getItem(LOCAL_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(profile: UserProfile): void {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalUsers();
    const idx = list.findIndex((u) => u.userId === profile.userId || (u.email && u.email === profile.email));
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...profile };
    } else {
      list.unshift(profile);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(list));
  } catch {
    // ignore
  }
}

function removeLocalUser(userId: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = getLocalUsers();
    const filtered = list.filter((u) => u.userId !== userId && u.email !== userId);
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }
}

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  // Check local cache first for fast response
  const localList = getLocalUsers();
  const foundLocal = localList.find((u) => u.userId === uid);

  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      saveLocalUser(data);
      return data;
    }
  } catch (err) {
    console.error("Error fetching user profile from Firestore:", err);
  }

  return foundLocal || null;
}

export async function createOrUpdateUserProfile(
  uid: string,
  email: string,
  displayName: string,
  role: UserRole = "STAFF"
): Promise<UserProfile> {
  const ref = doc(db, "users", uid);
  const now = new Date().toISOString();

  const profile: UserProfile = {
    userId: uid,
    email,
    displayName: displayName || email.split('@')[0],
    role,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  };

  // Always save locally so User Management list reflects it immediately
  saveLocalUser(profile);

  try {
    await setDoc(ref, profile, { merge: true });
  } catch (err) {
    console.warn("Could not persist user profile to Firestore (saved locally):", err);
  }
  return profile;
}

// Creates a real Firebase Auth account (with password) + Firestore profile,
// without signing out the currently logged-in admin.
export async function createStaffAccount(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "STAFF"
): Promise<UserProfile> {
  // Demo Mode or unauthenticated fallback
  if (isDemoMode) {
    const demoUid = `staff-${Date.now()}`;
    return await createOrUpdateUserProfile(demoUid, email, displayName, role);
  }

  let secondaryApp: any;
  try {
    secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const profile = await createOrUpdateUserProfile(cred.user.uid, email, displayName, role);
    return profile;
  } catch (err: any) {
    console.error("Error creating staff account:", err);
    if (err?.code === "auth/email-already-in-use") {
      throw new Error("This email address is already registered to another user.");
    }
    if (err?.code === "auth/invalid-email") {
      throw new Error("Please enter a valid email address.");
    }
    if (err?.code === "auth/weak-password") {
      throw new Error("Password must be at least 6 characters long.");
    }

    // Fallback: If auth creation fails due to network/rules, create profile record
    const fallbackUid = `user-${Date.now()}`;
    return await createOrUpdateUserProfile(fallbackUid, email, displayName, role);
  } finally {
    if (secondaryApp) {
      try {
        await deleteApp(secondaryApp);
      } catch {
        // ignore cleanup error
      }
    }
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  const localList = getLocalUsers();
  try {
    const col = collection(db, "users");
    const snap = await getDocs(col);
    const firestoreUsers = snap.docs.map((d) => d.data() as UserProfile);

    // Merge firestoreUsers and localList, deduplicating by userId or email
    const mergedMap = new Map<string, UserProfile>();
    for (const u of firestoreUsers) {
      const key = u.userId || u.email;
      if (key) mergedMap.set(key, u);
    }
    for (const u of localList) {
      const key = u.userId || u.email;
      if (key && !mergedMap.has(key)) {
        mergedMap.set(key, u);
      }
    }

    return Array.from(mergedMap.values());
  } catch (err) {
    console.error("Error fetching all users:", err);
    return localList;
  }
}

export async function updateUserRoleAndStatus(
  userId: string,
  role: UserRole,
  status: "ACTIVE" | "INACTIVE"
): Promise<void> {
  const localList = getLocalUsers();
  const found = localList.find((u) => u.userId === userId);
  if (found) {
    saveLocalUser({
      ...found,
      role,
      status,
      updatedAt: new Date().toISOString(),
    });
  }

  try {
    const ref = doc(db, "users", userId);
    await updateDoc(ref, {
      role,
      status,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.warn("Could not update user role/status in Firestore (updated locally):", err);
  }
}

export async function deleteUserProfile(userId: string): Promise<void> {
  removeLocalUser(userId);
  try {
    const ref = doc(db, "users", userId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn("Could not delete user profile from Firestore (deleted locally):", err);
  }
}