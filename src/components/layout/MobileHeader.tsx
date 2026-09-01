"use client";

import React from "react";
import Link from "next/link";
import { Menu, QrCode, School } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Badge } from "@/components/ui/Badge";

export const MobileHeader: React.FC<{ onOpenDrawer: () => void }> = ({ onOpenDrawer }) => {
  const { role } = useAuth();

  return (
    <header className="lg:hidden h-16 bg-slate-900 text-white px-4 flex items-center justify-between border-b border-slate-800 sticky top-0 z-30 shadow-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          className="p-2 -ml-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <School className="w-4 h-4" />
          </div>
          <span className="font-bold text-white text-base">SmartAttend</span>
        </Link>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/attendance/scan"
          className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-sm active:scale-95 transition-transform"
        >
          <QrCode className="w-4 h-4" />
          <span>Scan</span>
        </Link>
      </div>
    </header>
  );
};
