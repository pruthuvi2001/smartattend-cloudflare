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
import { auth, db, firebaseConfig, isDemoMode } from "./config";
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

  try {
    await setDoc(ref, profile, { merge: true });
  } catch (err) {
    console.warn("Could not persist user profile to Firestore (using fallback):", err);
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