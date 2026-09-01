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
  collection,
  getDocs,
  serverTimestamp
} from "firebase/firestore";
import { initializeApp, deleteApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { auth, db, firebaseConfig } from "./config";
import { UserProfile, UserRole } from "@/types/user";

export async function loginWithEmail(email: string, pass: string): Promise<User> {
  const cred = await signInWithEmailAndPassword(auth, email, pass);
  return cred.user;
}

export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (err) {
    console.error("Error fetching user profile:", err);
    return null;
  }
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

  await setDoc(ref, profile, { merge: true });
  return profile;
}

// NEW: creates a real Firebase Auth account (with password) + Firestore profile,
// without signing out the currently logged-in admin.
export async function createStaffAccount(
  email: string,
  password: string,
  displayName: string,
  role: UserRole = "STAFF"
): Promise<UserProfile> {
  const secondaryApp = initializeApp(firebaseConfig, `Secondary-${Date.now()}`);
  const secondaryAuth = getAuth(secondaryApp);

  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, password);
    const profile = await createOrUpdateUserProfile(cred.user.uid, email, displayName, role);
    return profile;
  } finally {
    await deleteApp(secondaryApp);
  }
}

export async function getAllUsers(): Promise<UserProfile[]> {
  try {
    const col = collection(db, "users");
    const snap = await getDocs(col);
    return snap.docs.map((d) => d.data() as UserProfile);
  } catch (err) {
    console.error("Error fetching all users:", err);
    return [];
  }
}

export async function updateUserRoleAndStatus(
  userId: string,
  role: UserRole,
  status: "ACTIVE" | "INACTIVE"
): Promise<void> {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, {
    role,
    status,
    updatedAt: new Date().toISOString(),
  });
}