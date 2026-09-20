"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getSystemSettings, saveSystemSettings } from "@/lib/settings/settingsService";
import { seedSampleStudents, clearAllStudents } from "@/lib/students/studentService";
import { SystemSettings, DEFAULT_SETTINGS } from "@/types/settings";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { School, Globe, Clock, Sparkles, Trash2, ShieldCheck, CheckCircle2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { ClassScheduleManager } from "@/components/classes/ClassScheduleManager";

export default function SettingsPage() {
  const { userProfile } = useAuth();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [schoolName, setSchoolName] = useState("");
  const [timezone, setTimezone] = useState("Asia/Colombo");
  const [cutoffTime, setCutoffTime] = useState("08:30");
  const [defaultMonthlyFee, setDefaultMonthlyFee] = useState("5000");
  const [currencySymbol, setCurrencySymbol] = useState("Rs.");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [clearing, setClearing] = useState(false);
  const toast = useToast();

  useEffect(() => {
    getSystemSettings().then((s) => {
      setSettings(s);
      setSchoolName(s.schoolName);
      setTimezone(s.timezone || "Asia/Colombo");
      setCutoffTime(s.attendanceCutoffTime || "08:30");
      setDefaultMonthlyFee(String(s.defaultMonthlyFee || 5000));
      setCurrencySymbol(s.currencySymbol || "Rs.");
    });
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await saveSystemSettings(
        {
          schoolName: schoolName.trim(),
          timezone,
          attendanceCutoffTime: cutoffTime,
          defaultMonthlyFee: parseFloat(defaultMonthlyFee) || 5000,
          currencySymbol: currencySymbol.trim() || "Rs.",
        },
        userProfile?.displayName || "Admin"
      );
      setSettings(updated);
      toast.success("Settings Saved", "System configuration updated successfully.");
    } catch (err: any) {
      toast.error("Error Saving", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      const count = await seedSampleStudents();
      toast.success("Sample Data Seeded", `Loaded ${count} sample students into database.`);
    } catch (err: any) {
      toast.error("Seed Error", err.message);
    } finally {
      setSeeding(false);
    }
  };

  const handleClear = async () => {
    if (!confirm("Are you sure you want to clear all student records? This action cannot be undone.")) {
      return;
    }
    setClearing(true);
    try {
      await clearAllStudents();
      toast.info("Database Reset", "All student records cleared.");
    } catch (err: any) {
      toast.error("Error", err.message);
    } finally {
      setClearing(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AppLayout>
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              System Settings
            </h1>
            <p className="text-xs text-slate-500">
              Configure institution profile, local timezone normalization, and database controls.
            </p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-6">
            {/* Institution Profile */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  Institution Information
                </CardTitle>
                <CardDescription>
                  Branding displayed across headers, ID badges, and official reports.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  label="School / Institute Name"
                  placeholder="e.g. SmartAttend Academy"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  required
                />
              </CardContent>
            </Card>

            {/* Timezone & Rules */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Globe className="w-4 h-4 text-indigo-600" />
                  Timezone & Attendance Rules
                </CardTitle>
                <CardDescription>
                  Normalized local timezone used to compute daily attendance dates and midnight boundaries.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Select
                  label="Local Institution Timezone (Default: Asia/Colombo)"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  options={[
                    { label: "Asia/Colombo (Sri Lanka / India Time GMT+5:30)", value: "Asia/Colombo" },
                    { label: "UTC (Coordinated Universal Time)", value: "UTC" },
                    { label: "Asia/Dubai (GMT+4)", value: "Asia/Dubai" },
                    { label: "Asia/Singapore (GMT+8)", value: "Asia/Singapore" },
                    { label: "Europe/London (GMT+0/BST)", value: "Europe/London" },
                    { label: "America/New_York (EST/EDT)", value: "America/New_York" },
                    { label: "America/Los_Angeles (PST/PDT)", value: "America/Los_Angeles" },
                  ]}
                />

                <Input
                  label="Morning Attendance Cutoff Time (Optional)"
                  type="time"
                  value={cutoffTime}
                  onChange={(e) => setCutoffTime(e.target.value)}
                  helperText="Arrivals recorded after this time can be flagged as LATE."
                />
              </CardContent>
            </Card>

            {/* Monthly Fee Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <School className="w-4 h-4 text-indigo-600" />
                  Monthly Fee Policy (Bookkeeping)
                </CardTitle>
                <CardDescription>
                  Configure baseline monthly fee amount and currency formatting.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Default Monthly Fee Amount *"
                    type="number"
                    min="0"
                    step="100"
                    placeholder="5000"
                    value={defaultMonthlyFee}
                    onChange={(e) => setDefaultMonthlyFee(e.target.value)}
                    helperText="Standard baseline fee per student/month."
                    required
                  />

                  <Input
                    label="Currency Symbol / Label *"
                    placeholder="Rs."
                    value={currencySymbol}
                    onChange={(e) => setCurrencySymbol(e.target.value)}
                    helperText="e.g. Rs., LKR, $, €"
                    required
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" isLoading={saving} className="font-bold">
                Save System Settings
              </Button>
            </div>
          </form>

          {/* Class Timetable & Schedule Management */}
          <Card className="p-6 bg-white">
            <ClassScheduleManager />
          </Card>

          {/* Development & Seed Data Management */}
          <Card className="border-amber-200 bg-amber-50/40">
            <CardHeader>
              <CardTitle className="text-sm text-amber-950 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-600" />
                Seed & Database Maintenance
              </CardTitle>
              <CardDescription className="text-amber-800">
                Populate or reset test data for quick demonstration and evaluation.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-amber-200">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Load 10 Realistic Sample Students</h4>
                  <p className="text-[11px] text-slate-500">
                    Instantly seeds student IDs `STU001` through `STU010` with QR values.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSeed}
                  isLoading={seeding}
                  className="bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 shrink-0"
                >
                  Load Seed Data
                </Button>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-rose-200">
                <div>
                  <h4 className="text-xs font-bold text-rose-900">Clear All Student Records</h4>
                  <p className="text-[11px] text-slate-500">
                    Removes all students to prepare for fresh production onboarding.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={handleClear}
                  isLoading={clearing}
                  className="shrink-0"
                >
                  Clear All Data
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
