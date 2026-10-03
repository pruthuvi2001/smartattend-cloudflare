"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, collection, getDocs } from "firebase/firestore";
import { auth, db, isDemoMode } from "@/lib/firebase/config";
import { getUserProfile, createOrUpdateUserProfile, getAllUsers, logoutUser, saveLocalUser } from "@/lib/firebase/auth";
import { UserProfile, UserRole } from "@/types/user";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  isAdmin: boolean;
  isStaff: boolean;
  loading: boolean;
  demoMode: boolean;
  loginAsDemo: (role?: UserRole) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  userProfile: null,
  role: "STAFF",
  isAdmin: false,
  isStaff: true,
  loading: true,
  demoMode: false,
  loginAsDemo: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUserRole, setDemoUserRole] = useState<UserRole | null>(null);

  const fetchProfile = async (firebaseUser: User) => {
    try {
      // 1. Check if user document physically exists in Firestore
      const userDocRef = doc(db, "users", firebaseUser.uid);
      let profile: UserProfile | null = null;
      let docExistsInFirestore = false;

      try {
        const snap = await getDoc(userDocRef);
        if (snap.exists()) {
          profile = snap.data() as UserProfile;
          docExistsInFirestore = true;
          saveLocalUser(profile);
        }
      } catch (docErr) {
        console.warn("Could not read user profile directly from Firestore:", docErr);
      }

      // 2. Fall back to cached local profile if Firestore didn't have it
      if (!profile) {
        profile = await getUserProfile(firebaseUser.uid);
      }

      // 3. If neither exists, determine role and generate new profile
      if (!profile) {
        let firestoreUserCount = 0;
        try {
          const snap = await getDocs(collection(db, "users"));
          firestoreUserCount = snap.size;
        } catch {}

        const initialRole: UserRole = firestoreUserCount === 0 ? "ADMIN" : "STAFF";
        profile = {
          userId: firebaseUser.uid,
          email: firebaseUser.email || "user@smartattend.edu",
          displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Staff Member",
          role: initialRole,
          status: "ACTIVE",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }

      // 4. CRITICAL SELF-HEALING: If doc was missing in Firestore (e.g. wiped during DB cleanup),
      // actively recreate/write it to Firestore so security rules and permission checks pass!
      if (!docExistsInFirestore) {
        try {
          await setDoc(userDocRef, profile, { merge: true });
          console.log("Restored user profile to Firestore:", profile.userId);
        } catch (syncErr) {
          console.warn("Could not write restored profile to Firestore:", syncErr);
        }
        saveLocalUser(profile);
      }

      setUserProfile(profile);
    } catch (err) {
      console.error("Error in fetchProfile:", err);
      // Fallback profile if Firestore fails or offline
      setUserProfile({
        userId: firebaseUser.uid,
        email: firebaseUser.email || "user@smartattend.edu",
        displayName: firebaseUser.displayName || firebaseUser.email?.split('@')[0] || "Staff Member",
        role: "ADMIN",
        status: "ACTIVE",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  };

  useEffect(() => {
    let mounted = true;

    // Safety timeout fallback: Ensure loading is never stuck indefinitely
    const timeoutId = setTimeout(() => {
      if (mounted) {
        setLoading(false);
      }
    }, 2000);

    // Check if demo user saved in sessionStorage for instant dev persistence
    if (typeof window !== 'undefined') {
      const savedDemo = sessionStorage.getItem('smartattend_demo_user');
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUserProfile(parsed);
          setDemoUserRole(parsed.role);
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        } catch {
          // ignore
        }
      }
    }

    let unsubscribe = () => {};

    try {
      unsubscribe = onAuthStateChanged(
        auth,
        async (currentUser) => {
          if (!mounted) return;
          try {
            setUser(currentUser);
            if (currentUser) {
              await fetchProfile(currentUser);
            } else {
              if (!demoUserRole) {
                setUserProfile(null);
              }
            }
          } catch (err) {
            console.error("Auth callback error:", err);
          } finally {
            if (mounted) {
              setLoading(false);
              clearTimeout(timeoutId);
            }
          }
        },
        (error) => {
          console.error("onAuthStateChanged error:", error);
          if (mounted) {
            setLoading(false);
            clearTimeout(timeoutId);
          }
        }
      );
    } catch (err) {
      console.error("Firebase auth initialization error:", err);
      if (mounted) {
        setLoading(false);
        clearTimeout(timeoutId);
      }
    }

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      unsubscribe();
    };
  }, [demoUserRole]);

  const loginAsDemo = (role: UserRole = "ADMIN") => {
    const demoProfile: UserProfile = {
      userId: `demo-${role.toLowerCase()}-001`,
      email: `${role.toLowerCase()}@smartattend.edu`,
      displayName: role === "ADMIN" ? "Admin Administrator" : "Staff Member (Demo)",
      role,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(demoProfile);
    setDemoUserRole(role);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('smartattend_demo_user', JSON.stringify(demoProfile));
    }
    setLoading(false);
  };

  const logout = async () => {
    setDemoUserRole(null);
    setUserProfile(null);
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('smartattend_demo_user');
    }
    try {
      await logoutUser();
    } catch {
      // ignore
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user);
    }
  };

  const currentRole: UserRole = userProfile?.role || "STAFF";
  const isAdmin = currentRole === "ADMIN";
  const isStaff = currentRole === "STAFF" || currentRole === "ADMIN";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: currentRole,
        isAdmin,
        isStaff,
        loading,
        demoMode: isDemoMode,
        loginAsDemo,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
