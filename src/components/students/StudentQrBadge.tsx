"use client";

import React, { useEffect, useRef } from "react";
import QRCode from "qrcode";
import { Student } from "@/types/student";
import { Button } from "@/components/ui/Button";
import { Printer, Download, School, Sparkles, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface StudentQrBadgeProps {
  student: Student;
  schoolName?: string;
}

export const StudentQrBadge: React.FC<StudentQrBadgeProps> = ({
  student,
  schoolName = "SmartAttend Academy",
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (canvasRef.current && student.qrCodeValue) {
      QRCode.toCanvas(
        canvasRef.current,
        student.qrCodeValue,
        {
          width: 180,
          margin: 1,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        },
        (error) => {
          if (error) console.error("QR render error:", error);
        }
      );
    }
  }, [student.qrCodeValue]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const url = canvasRef.current.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `QR_${student.studentId}_${student.fullName.replace(/\s+/g, "_")}.png`;
    a.click();
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Physical ID Card Preview Container */}
      <div
        id="printable-badge"
        className="w-full max-w-sm mx-auto bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden print:border-none print:shadow-none print:m-0 print:max-w-none"
      >
        {/* Card Header */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-indigo-800 text-white p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center text-white">
              <School className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">
                Official Student ID
              </p>
              <h4 className="font-extrabold text-sm tracking-tight">{schoolName}</h4>
            </div>
          </div>
          <Badge variant="purple" size="sm" className="bg-indigo-950/60 text-indigo-200 border-indigo-400/30 text-[10px]">
            {student.class}
          </Badge>
        </div>

        {/* Card Body */}
        <div className="p-5 flex flex-col items-center text-center space-y-4 bg-slate-50/50">
          {/* Student Photo / Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-indigo-100 border-2 border-indigo-300 flex items-center justify-center text-indigo-800 font-extrabold text-2xl shadow-md">
              {student.fullName.charAt(0).toUpperCase()}
            </div>
            {student.status === "ACTIVE" && (
              <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white text-[10px]">
                ✓
              </span>
            )}
          </div>

          <div>
            <h3 className="font-bold text-lg text-slate-900 leading-tight">{student.fullName}</h3>
            <p className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md inline-block mt-1">
              ID: {student.studentId}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2 w-full text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-[10px] text-slate-400 block font-semibold uppercase">Class</span>
              <strong>{student.class}</strong>
            </div>
          </div>

          {/* High-Resolution QR Canvas */}
          <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-sm">
            <canvas ref={canvasRef} className="rounded" />
            <p className="text-[10px] text-slate-400 font-mono mt-1 font-semibold">
              QR: {student.qrCodeValue}
            </p>
          </div>
        </div>

        {/* Card Footer Bar */}
        <div className="p-2.5 bg-slate-100 border-t border-slate-200 text-center text-[10px] text-slate-500 font-medium">
          Scan with SmartAttend Scanner for Instant Attendance
        </div>
      </div>

      {/* Action Buttons (Hidden when printing) */}
      <div className="flex items-center justify-center gap-3 no-print">
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownload}
          leftIcon={<Download className="w-3.5 h-3.5" />}
        >
          Download QR PNG
        </Button>
        <Button
          variant="primary"
          size="sm"
          onClick={handlePrint}
          leftIcon={<Printer className="w-3.5 h-3.5" />}
        >
          Print ID Card
        </Button>
      </div>
    </div>
  );
};