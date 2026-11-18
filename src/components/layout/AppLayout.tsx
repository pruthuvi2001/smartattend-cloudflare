"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { MobileHeader } from "./MobileHeader";
import { X } from "lucide-react";
import { ChristmasLights } from "@/components/theme/ChristmasLights";

export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent flex flex-col lg:flex-row">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen">
        <Sidebar />
      </div>

      {/* Mobile Header */}
      <MobileHeader onOpenDrawer={() => setMobileDrawerOpen(true)} />

      {/* Mobile Drawer Backdrop and Sidebar */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />

          {/* Drawer Panel */}
          <div className="relative z-10 flex">
            <Sidebar onCloseMobile={() => setMobileDrawerOpen(false)} />
            <button
              onClick={() => setMobileDrawerOpen(false)}
              className="p-2 m-2 h-10 w-10 text-white bg-slate-800/80 rounded-lg hover:bg-slate-700 transition-colors flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Page Content Area */}
      <main className="flex-1 min-w-0 overflow-y-auto relative">
        <ChristmasLights className="absolute inset-x-0 top-0 z-20" />
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 pt-10 sm:pt-11 lg:pt-12">
          {children}
        </div>
      </main>
    </div>
  );
};
