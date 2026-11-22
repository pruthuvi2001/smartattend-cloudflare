"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { UserRole } from "@/types/user";
import { Permission, firstAllowedPage } from "@/lib/auth/permissions";
import { Loader2, ShieldAlert, UserX } from "lucide-react";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Only this role may open the page (used for ADMIN-only pages). */
  requiredRole?: UserRole;
  /** The page opens when the user has ANY of these permissions. */
  permission?: Permission | Permission[];
}

/**
 * Guards a page: signed in, account active, and allowed by role permissions.
 * Typing the address directly does not get around it, and the database rules
 * block the same actions on the server.
 */
export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole, permission }) => {
  const { user, userProfile, loading, isAdmin, isActive, canAny, permissions, profileError, logout } = useAuth();
  const router = useRouter();

  const roleOk = requiredRole !== "ADMIN" || isAdmin;
  const needed = permission === undefined ? [] : Array.isArray(permission) ? permission : [permission];
  const permOk = needed.length === 0 || canAny(needed);
  // Login always lands on /dashboard: send users without Dashboard access to their first allowed page.
  const landing = !loading && isActive && !permOk && needed.includes("dashboard_view") ? firstAllowedPage(permissions, isAdmin) : null;

  useEffect(() => {
    if (!loading && !user && !userProfile && !profileError) router.replace("/login");
  }, [user, userProfile, loading, profileError, router]);

  useEffect(() => {
    if (landing && landing !== "/dashboard") router.replace(landing);
  }, [landing, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-transparent gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (profileError) {
    return (
      <Notice icon={<ShieldAlert className="w-6 h-6 text-rose-600" />} title="Account not loaded" text={profileError}>
        <button onClick={() => window.location.reload()} className="text-sm font-semibold text-indigo-600 underline">
          Try again
        </button>
      </Notice>
    );
  }

  if (!user && !userProfile) return null;

  if (!isActive) {
    return (
      <Notice
        icon={<UserX className="w-6 h-6 text-rose-600" />}
        title="Account not active"
        text="Your account is inactive or waiting for approval. Please ask an administrator to activate it in User Management."
      >
        <button onClick={() => logout()} className="text-sm font-semibold text-indigo-600 underline">
          Sign out
        </button>
      </Notice>
    );
  }

  if (!roleOk || !permOk) {
    if (landing && landing !== "/dashboard") return null; // redirecting
    return (
      <Notice
        icon={<ShieldAlert className="w-6 h-6 text-rose-600" />}
        title="Access restricted"
        text={
          requiredRole === "ADMIN"
            ? "Administrator privileges are required to view this section."
            : landing === null && needed.includes("dashboard_view")
            ? "Your role has no permissions yet. Ask an administrator to give your role access in Role & Permissions."
            : "Your role does not have permission to open this page. Ask an administrator if you need access."
        }
      />
    );
  }

  return <>{children}</>;
};

const Notice: React.FC<{ icon: React.ReactNode; title: string; text: string; children?: React.ReactNode }> = ({ icon, title, text, children }) => (
  <div className="p-8 text-center bg-white rounded-xl border border-rose-200 m-8 max-w-xl mx-auto space-y-3">
    <div className="flex justify-center">{icon}</div>
    <h3 className="text-lg font-bold text-rose-700">{title}</h3>
    <p className="text-sm text-slate-600">{text}</p>
    {children}
  </div>
);
