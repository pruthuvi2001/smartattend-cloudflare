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
    <div className="min-h-screen relative overflow-hidden flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Fullscreen Video Background */}
      <div className="absolute inset-0 z-0 bg-slate-950">
        <video
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover opacity-70"
          poster="/videos/login-bg-poster.jpg"
        >
          <source src="/videos/login-bg.webm" type="video/webm" />
          <source src="/videos/login-bg.mp4" type="video/mp4" />
        </video>
        {/* Dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/70 via-slate-950/50 to-slate-950/80" />
      </div>

      {/* Ambient glow blobs on top of video for extra depth */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none z-[1]" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none z-[1]" />

      {/* Header Container */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10 relative">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600/90 backdrop-blur-sm flex items-center justify-center text-white shadow-xl shadow-indigo-600/40 mb-4 border border-white/20">
          <School className="w-8 h-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight drop-shadow-lg">
          Wisdom English Academy
        </h2>
        <p className="mt-1.5 text-xs sm:text-sm text-slate-300">
          Powered By Banana Kingdom. 
        </p>
      </div>

      {/* Liquid Glass Card Container */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 z-10 relative">
        <div className="bg-white/10 backdrop-blur-2xl py-8 px-6 sm:px-8 shadow-2xl rounded-2xl border border-white/20 ring-1 ring-white/10">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-500/20 backdrop-blur-sm border border-rose-400/30 text-rose-100 text-xs font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  placeholder="admin@smartattend.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-2.5 pl-10 pr-3 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300/50 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl py-2.5 pl-10 pr-10 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400/60 focus:border-indigo-300/50 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-white focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full py-2.5 font-bold shadow-md shadow-indigo-600/30"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          {/* Quick Demo Access Bar (Disabled) */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-slate-400" />
              Quick Evaluation Access
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                onClick={() => handleDemoLogin("ADMIN")}
                className="text-xs bg-white/5 border-white/10 text-slate-400 opacity-50 cursor-not-allowed"
                leftIcon={<ShieldCheck className="w-3.5 h-3.5 text-slate-400" />}
              >
                Admin Role
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled
                onClick={() => handleDemoLogin("STAFF")}
                className="text-xs bg-white/5 border-white/10 text-slate-400 opacity-50 cursor-not-allowed"
                leftIcon={<UserCheck className="w-3.5 h-3.5 text-slate-400" />}
              >
                Staff Role
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-slate-300 drop-shadow">
          Equipped with Atomic Duplicate Prevention & Camera QR Scanning.
        </p>
      </div>
    </div>
  );
}