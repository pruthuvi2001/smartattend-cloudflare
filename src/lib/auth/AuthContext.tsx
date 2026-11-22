"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { auth, db, isDemoMode } from "@/lib/firebase/config";
import { getLocalUsers, logoutUser, saveLocalUser } from "@/lib/firebase/auth";
import { UserProfile, UserRole } from "@/types/user";
import { Permission, RolePermissionMap, permissionsFor } from "@/lib/auth/permissions";
import { subscribeRolePermissions } from "@/lib/auth/rolePermissionsService";

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  role: UserRole;
  /** ACTIVE admin. */
  isAdmin: boolean;
  /** Kept for older code: any active non-viewer role. Prefer can(). */
  isStaff: boolean;
  /** False when an Admin has deactivated this account (or it is waiting for approval). */
  isActive: boolean;
  /** Permissions of the signed-in user, kept up to date live. */
  permissions: Set<Permission>;
  can: (permission: Permission) => boolean;
  canAny: (permissions: Permission[]) => boolean;
  /** The role → permissions map saved by the Admin (null = built-in defaults). */
  rolePermissions: RolePermissionMap | null;
  /** Set when the account profile could not be loaded at all. */
  profileError: string | null;
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
  isStaff: false,
  isActive: false,
  permissions: new Set(),
  can: () => false,
  canAny: () => false,
  rolePermissions: null,
  profileError: null,
  loading: true,
  demoMode: false,
  loginAsDemo: () => {},
  logout: async () => {},
  refreshProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoUserRole, setDemoUserRole] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<RolePermissionMap | null>(null);
  // Pages wait until the saved permissions have arrived, so nobody briefly sees more than allowed.
  const [permsLoaded, setPermsLoaded] = useState(false);

  /**
   * Load the signed-in user's profile.
   *  - Profile found in Firestore → use it.
   *  - Firestore unreachable (offline) → use the copy cached in this browser.
   *  - Firestore says there is NO profile → create a pending (INACTIVE) profile.
   *    An Admin must activate it in User Management. (Previously a missing profile
   *    could end up with full access — that was a security hole.)
   */
  const fetchProfile = useCallback(async (firebaseUser: User) => {
    setProfileError(null);
    const ref = doc(db, "users", firebaseUser.uid);
    let snapExists: boolean | null = null; // null = could not reach Firestore
    try {
      const snap = await getDoc(ref);
      snapExists = snap.exists();
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        saveLocalUser(profile);
        setUserProfile(profile);
        return;
      }
    } catch (err) {
      console.warn("Could not read user profile from Firestore:", err);
    }

    if (snapExists === null) {
      const cached = getLocalUsers().find((u) => u.userId === firebaseUser.uid);
      if (cached) {
        setUserProfile(cached);
      } else {
        setUserProfile(null);
        setProfileError("Could not load your account. Check the internet connection and refresh the page.");
      }
      return;
    }

    const now = new Date().toISOString();
    const pending: UserProfile = {
      userId: firebaseUser.uid,
      email: firebaseUser.email || "",
      displayName: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "New user",
      role: "STAFF",
      status: "INACTIVE",
      createdAt: now,
      updatedAt: now,
    };
    try {
      await setDoc(ref, pending);
    } catch (err) {
      console.warn("Could not create pending profile:", err);
    }
    setUserProfile(pending);
  }, []);

  // Firebase sign-in state
  useEffect(() => {
    let mounted = true;
    const timeoutId = setTimeout(() => mounted && setLoading(false), 4000);

    if (typeof window !== "undefined") {
      const savedDemo = sessionStorage.getItem("smartattend_demo_user");
      if (savedDemo) {
        try {
          const parsed = JSON.parse(savedDemo);
          setUserProfile(parsed);
          setDemoUserRole(parsed.role);
          setLoading(false);
          clearTimeout(timeoutId);
          return;
        } catch {
          /* ignore */
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
            if (currentUser) await fetchProfile(currentUser);
            else if (!demoUserRole) setUserProfile(null);
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
  }, [demoUserRole, fetchProfile]);

  // Live updates of the user's own role / status (e.g. Admin changes their role).
  const uid = user?.uid;
  useEffect(() => {
    if (!uid || isDemoMode) return;
    return onSnapshot(
      doc(db, "users", uid),
      (snap) => {
        if (snap.exists()) {
          const profile = snap.data() as UserProfile;
          saveLocalUser(profile);
          setUserProfile(profile);
        }
      },
      () => {
        /* offline: keep the last known profile */
      }
    );
  }, [uid]);

  // Live updates of the role permissions saved by the Admin.
  const signedIn = !!uid || !!demoUserRole;
  useEffect(() => {
    if (!signedIn) {
      setPermsLoaded(false);
      return;
    }
    // Safety net: never wait forever (offline etc.) — fall back to the last known / default map.
    const t = setTimeout(() => setPermsLoaded(true), 6000);
    const unsub = subscribeRolePermissions((map) => {
      setRolePermissions(map);
      setPermsLoaded(true);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, [signedIn]);

  const loginAsDemo = (role: UserRole = "ADMIN") => {
    const demoProfile: UserProfile = {
      userId: `demo-${role.toLowerCase()}-001`,
      email: `${role.toLowerCase()}@smartattend.edu`,
      displayName: role === "ADMIN" ? "Admin Administrator" : `${role.charAt(0)}${role.slice(1).toLowerCase()} (Demo)`,
      role,
      status: "ACTIVE",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setUserProfile(demoProfile);
    setDemoUserRole(role);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("smartattend_demo_user", JSON.stringify(demoProfile));
    }
    setLoading(false);
  };

  const logout = async () => {
    setDemoUserRole(null);
    setUserProfile(null);
    setRolePermissions(null);
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("smartattend_demo_user");
    }
    try {
      await logoutUser();
    } catch {
      /* ignore */
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user);
  };

  const currentRole: UserRole = userProfile?.role || "STAFF";
  // Older profiles may not have a status field: treat them as active, like before.
  const isActive = !!userProfile && (userProfile.status ?? "ACTIVE") === "ACTIVE";
  const permissions = useMemo(
    () => (isActive ? permissionsFor(currentRole, rolePermissions) : new Set<Permission>()),
    [isActive, currentRole, rolePermissions]
  );
  const can = useCallback((p: Permission) => permissions.has(p), [permissions]);
  const canAny = useCallback((ps: Permission[]) => ps.some((p) => permissions.has(p)), [permissions]);
  const isAdmin = isActive && currentRole === "ADMIN";
  const isStaff = isActive && currentRole !== "VIEWER";

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        role: currentRole,
        isAdmin,
        isStaff,
        isActive,
        permissions,
        can,
        canAny,
        rolePermissions,
        profileError,
        loading: loading || (signedIn && !permsLoaded),
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
