"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { loginWithEmail } from "@/lib/firebase/auth";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { School, Lock, Mail, Eye, EyeOff, ShieldCheck, UserCheck, Sparkles, QrCode } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const { user, userProfile, loginAsDemo } = useAuth();
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    if (user || userProfile) {
      router.replace("/dashboard");
    }
  }, [user, userProfile, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
      toast.success("Signed in successfully", `Welcome back!`);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      const code = err?.code || "";
      if (code === "auth/invalid-credential" || code === "auth/user-not-found" || code === "auth/wrong-password") {
        setErrorMsg("Invalid email address or password. Please try again.");
      } else if (code === "auth/too-many-requests") {
        setErrorMsg("Too many failed attempts. Please try again later.");
      } else {
        setErrorMsg(err?.message || "Failed to sign in. Please verify your credentials.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = (role: "ADMIN" | "STAFF") => {
    loginAsDemo(role);
    toast.success(`Logged in as ${role}`, "Demo environment ready");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Subtle Gradient Blobs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-600/40 mb-4">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          MathLAbs
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-400">
          Powered By Banana Kingdom. 
        </p>
      </div>

      {/* Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10">
        <div className="bg-white py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <Input
              label="Email Address"
              type="email"
              placeholder="admin@smartattend.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
              required
              autoFocus
            />

            <div>
              <Input
                label="Password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="focus:outline-none hover:text-slate-700"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 font-bold shadow-md shadow-indigo-600/20"
              isLoading={isLoading}
            >
              Sign In to System
            </Button>
          </form>

          {/* Quick Demo Access Bar */}
          <div className="mt-6 pt-6 border-t border-slate-100">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              Quick Evaluation Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("ADMIN")}
                className="text-xs bg-slate-50 border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200"
                leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />}
              >
                Admin Role
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleDemoLogin("STAFF")}
                className="text-xs bg-slate-50 border-slate-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                leftIcon={<UserCheck className="w-3.5 h-3.5 text-emerald-600" />}
              >
                Staff Role
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-400">
          Equipped with Atomic Duplicate Prevention & Camera QR Scanning.
        </p>
      </div>
    </div>
  );
}
