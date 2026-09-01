"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertTriangle, XCircle, Clock, User, Award, ArrowRight } from "lucide-react";
import { ScanAttendanceResult } from "@/lib/attendance/attendanceService";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

export interface ScanSuccessCardProps {
  result: ScanAttendanceResult;
  onDismiss: () => void;
  autoDismissMs?: number;
  onViewFeeStatus?: (studentId: string) => void;
}

export const ScanSuccessCard: React.FC<ScanSuccessCardProps> = ({
  result,
  onDismiss,
  autoDismissMs = 2200,
  onViewFeeStatus,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (result.status === "NOT_FOUND" || result.status === "INACTIVE") {
      // Don't auto-dismiss error states immediately to allow teacher to read
      return;
    }

    const intervalTime = 50;
    const step = (intervalTime / autoDismissMs) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev <= 0) {
          clearInterval(timer);
          onDismiss();
          return 0;
        }
        return prev - step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [result, onDismiss, autoDismissMs]);

  const student = result.student;
  const record = result.record || result.existingRecord;

  if (result.status === "SUCCESS") {
    return (
      <div className="bg-emerald-600 text-white rounded-2xl p-6 shadow-xl border-2 border-emerald-400/50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-emerald-500/60 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white text-emerald-600 flex items-center justify-center font-bold shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-200">
                Verified Cloud Record
              </p>
              <h3 className="text-xl font-extrabold tracking-tight">ATTENDANCE MARKED</h3>
            </div>
          </div>
          <Badge variant="success" className="bg-emerald-700/80 text-white border-emerald-400 font-bold px-3 py-1">
            PRESENT
          </Badge>
        </div>

        <div className="space-y-3 bg-emerald-700/40 rounded-xl p-4 border border-emerald-500/40">
          <div>
            <p className="text-xs text-emerald-200 font-medium">Student Name</p>
            <p className="text-2xl font-black text-white">{student?.fullName || "Student"}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-emerald-500/30">
            <div>
              <p className="text-[11px] text-emerald-200 font-medium">Student ID</p>
              <p className="text-sm font-bold font-mono text-white">{student?.studentId}</p>
            </div>
            <div>
              <p className="text-[11px] text-emerald-200 font-medium">Class / Section</p>
              <p className="text-sm font-bold text-white">{student?.class} - {student?.section}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-emerald-500/30 text-xs text-emerald-100">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> Time: <strong className="text-white">{record?.timeFormatted}</strong>
            </span>
            <span>Recorded via QR</span>
          </div>
        </div>

        {/* View Fee Status Trigger */}
        {onViewFeeStatus && student && (
          <div className="mt-3">
            <button
              onClick={() => onViewFeeStatus(student.studentId)}
              className="w-full py-2 px-3 bg-emerald-800/80 hover:bg-emerald-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-emerald-400/40 transition-colors shadow-sm"
            >
              <span>💳 View Current Month Fee Status</span>
            </button>
          </div>
        )}

        {/* Progress Countdown Bar */}
        <div className="mt-3 flex items-center justify-between text-xs text-emerald-200">
          <span>Ready for next student...</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-white hover:bg-emerald-700/60 text-xs px-2 py-1 h-auto"
            rightIcon={<ArrowRight className="w-3.5 h-3.5 ml-1" />}
          >
            Scan Next
          </Button>
        </div>
        <div className="w-full bg-emerald-800/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  if (result.status === "ALREADY_MARKED") {
    return (
      <div className="bg-amber-500 text-white rounded-2xl p-6 shadow-xl border-2 border-amber-300/50 animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-amber-400/60 pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-full bg-white text-amber-600 flex items-center justify-center font-bold shadow-md">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-amber-100">
                Duplicate Prevented
              </p>
              <h3 className="text-xl font-extrabold tracking-tight">ALREADY MARKED</h3>
            </div>
          </div>
          <Badge variant="warning" className="bg-amber-600/80 text-white border-amber-300 font-bold px-3 py-1">
            RECORDED
          </Badge>
        </div>

        <div className="space-y-3 bg-amber-600/40 rounded-xl p-4 border border-amber-400/40">
          <div>
            <p className="text-xs text-amber-100 font-medium">Student</p>
            <p className="text-xl font-bold text-white">{student?.fullName}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-400/30 text-xs">
            <div>
              <p className="text-amber-100">Student ID</p>
              <p className="font-mono font-bold text-white">{student?.studentId}</p>
            </div>
            <div>
              <p className="text-amber-100">Class</p>
              <p className="font-bold text-white">{student?.class} - {student?.section}</p>
            </div>
          </div>

          <p className="text-xs text-amber-100 bg-amber-700/40 p-2 rounded-lg border border-amber-400/30">
            First recorded today at: <strong className="text-white font-mono">{record?.timeFormatted || "Earlier today"}</strong>
          </p>
        </div>

        {/* View Fee Status Trigger */}
        {onViewFeeStatus && student && (
          <div className="mt-3">
            <button
              onClick={() => onViewFeeStatus(student.studentId)}
              className="w-full py-2 px-3 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 border border-amber-400/40 transition-colors shadow-sm"
            >
              <span>💳 View Current Month Fee Status</span>
            </button>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between text-xs text-amber-100">
          <span>Resuming camera...</span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="text-white hover:bg-amber-600/60 text-xs px-2 py-1 h-auto"
            rightIcon={<ArrowRight className="w-3.5 h-3.5 ml-1" />}
          >
            Next
          </Button>
        </div>
        <div className="w-full bg-amber-700/60 rounded-full h-1.5 mt-1.5 overflow-hidden">
          <div
            className="bg-white h-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Error States: NOT_FOUND or INACTIVE
  return (
    <div className="bg-rose-600 text-white rounded-2xl p-6 shadow-xl border-2 border-rose-400/50 animate-in zoom-in-95 duration-200">
      <div className="flex items-center gap-3 border-b border-rose-500/60 pb-4 mb-4">
        <div className="w-10 h-10 rounded-full bg-white text-rose-600 flex items-center justify-center font-bold shadow-md">
          <XCircle className="w-6 h-6" />
        </div>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-rose-200">
            Scanner Alert
          </p>
          <h3 className="text-xl font-extrabold tracking-tight">
            {result.status === "INACTIVE" ? "STUDENT INACTIVE" : "STUDENT NOT FOUND"}
          </h3>
        </div>
      </div>

      <div className="bg-rose-700/40 rounded-xl p-4 border border-rose-500/40 space-y-2 mb-4 text-sm text-rose-50">
        <p>{result.message}</p>
        {result.status === "NOT_FOUND" && (
          <p className="text-xs text-rose-200">
            Please make sure this student ID is registered in the Student Directory.
          </p>
        )}
      </div>

      <Button
        variant="secondary"
        className="w-full bg-white text-rose-700 hover:bg-rose-50 font-bold"
        onClick={onDismiss}
      >
        Try Again
      </Button>
    </div>
  );
};
