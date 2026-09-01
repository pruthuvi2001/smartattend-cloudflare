"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { UserRole } from "@/types/user";
import { Loader2 } from "lucide-react";

export interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: UserRole;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
  const { user, userProfile, loading, role, isAdmin } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user && !userProfile) {
        router.replace("/login");
      } else if (requiredRole === "ADMIN" && !isAdmin) {
        router.replace("/dashboard");
      }
    }
  }, [user, userProfile, loading, isAdmin, requiredRole, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
        <p className="text-sm font-medium text-slate-500">Checking credentials...</p>
      </div>
    );
  }

  if (!user && !userProfile) {
    return null;
  }

  if (requiredRole === "ADMIN" && !isAdmin) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-rose-200 m-8">
        <h3 className="text-lg font-bold text-rose-700">Access Restricted</h3>
        <p className="text-sm text-slate-600 mt-2">
          Administrator privileges are required to view this section.
        </p>
      </div>
    );
  }

  return <>{children}</>;
};
