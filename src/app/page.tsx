"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, userProfile, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user || userProfile) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }
  }, [user, userProfile, loading, router]);

  // Fail-safe redirect timer: Ensure page never gets stuck forever
  useEffect(() => {
    const timer = setTimeout(() => {
      if (user || userProfile) {
        router.replace("/dashboard");
      } else {
        router.replace("/login");
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [user, userProfile, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
      <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      <p className="text-sm font-medium text-slate-500">Loading SmartAttend...</p>
    </div>
  );
}
