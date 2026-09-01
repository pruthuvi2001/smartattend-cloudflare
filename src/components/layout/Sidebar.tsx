"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Users,
  FileSpreadsheet,
  ShieldCheck,
  Settings,
  LogOut,
  Sparkles,
  School,
  GraduationCap,
  Receipt
} from "lucide-react";
import { clsx } from "clsx";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/components/ui/Badge";

export const Sidebar: React.FC<{ onCloseMobile?: () => void }> = ({ onCloseMobile }) => {
  const pathname = usePathname();
  const { userProfile, role, isAdmin, logout } = useAuth();

  const mainNav = [
    { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { label: "Attendance Scanner", href: "/attendance/scan", icon: QrCode, highlight: true },
    { label: "Attendance Records", href: "/attendance", icon: FileSpreadsheet },
    { label: "Students", href: "/students", icon: GraduationCap },
    { label: "Monthly Payments", href: "/monthly-payments", icon: Receipt },
    { label: "Reports", href: "/reports", icon: Users },
  ];

  const adminNav = [
    { label: "User Management", href: "/users", icon: ShieldCheck },
    { label: "System Settings", href: "/settings", icon: Settings },
  ];

  const handleLinkClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 h-screen bg-slate-900 text-slate-300 flex flex-col justify-between shrink-0 border-r border-slate-800">
      {/* Brand Header */}
      <div>
        <div className="p-6 flex items-center gap-3 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <School className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-white tracking-tight text-base">Wisdom English Academy</h1>
              <span className="bg-indigo-950 text-indigo-400 text-[10px] font-semibold px-1.5 py-0.5 rounded border border-indigo-800">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Student Attendance Management</p>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="p-4 space-y-6">
          <div>
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Menu
            </p>
            <nav className="space-y-1">
              {mainNav.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={handleLinkClick}
                    className={clsx(
                      "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                      isActive
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Icon
                        className={clsx(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span>{item.label}</span>
                    </div>
                    {item.highlight && !isActive && (
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping" />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {isAdmin && (
            <div>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Administration
              </p>
              <nav className="space-y-1">
                {adminNav.map((item) => {
                  const isActive = pathname.startsWith(item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={handleLinkClick}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                        isActive
                          ? "bg-indigo-600 text-white shadow-sm"
                          : "text-slate-300 hover:bg-slate-800/60 hover:text-white"
                      )}
                    >
                      <Icon
                        className={clsx(
                          "w-4 h-4 transition-colors",
                          isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                        )}
                      />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* User Profile Footer */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
              {userProfile?.displayName ? userProfile.displayName.charAt(0).toUpperCase() : "U"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {userProfile?.displayName || "Authorized User"}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge
                  variant={role === "ADMIN" ? "purple" : "neutral"}
                  size="sm"
                  className="text-[10px] py-0 px-1.5"
                >
                  {role}
                </Badge>
              </div>
            </div>
          </div>

          <button
            onClick={() => logout()}
            title="Sign Out"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
