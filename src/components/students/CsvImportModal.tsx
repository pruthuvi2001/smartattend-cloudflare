"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { StudentFormData } from "@/types/student";

export interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: StudentFormData[]) => Promise<number>;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  isOpen,
  onClose,
  onImport,
}) => {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<StudentFormData[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setError(null);
    setSuccessCount(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          setError("CSV file must have a header row and at least one student data row.");
          return;
        }

        const dataRows: StudentFormData[] = [];
        // Skip header
        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.replace(/^"|"$/g, "").trim());
          if (parts.length >= 2 && parts[0]) {
            const sid = parts[0].toUpperCase();
            // Check if 5th column or 4th column is email
            let email = "";
            if (parts[4] && parts[4].includes("@")) {
              email = parts[4];
            } else if (parts[3] && parts[3].includes("@")) {
              email = parts[3];
            } else {
              email = `${sid.toLowerCase()}@smartattend.edu`;
            }

            const className = parts[2] || "Grade 10";
            const classId = className.trim().toLowerCase().replace(/\s+/g, "-");

            dataRows.push({
              studentId: sid,
              fullName: parts[1] || `Student ${sid}`,
              class: className,
              classIds: [classId],
              classDisplayNames: [className],
              qrCodeValue: (parts[3] && !parts[3].includes("@") ? parts[3] : sid).toUpperCase(),
              email,
              status: "ACTIVE",
            });
          }
        }

        setParsedRows(dataRows);
      } catch (err: any) {
        setError("Error parsing CSV: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleExecuteImport = async () => {
    if (parsedRows.length === 0) return;
    setImporting(true);
    setError(null);
    try {
      const count = await onImport(parsedRows);
      setSuccessCount(count);
    } catch (err: any) {
      setError(err?.message || "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Batch Import Students via CSV"
      description="Upload a CSV spreadsheet to onboard multiple students with their QR identifiers."
      maxWidth="lg"
    >
      <div className="space-y-4">
        {/* Format instructions */}
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
          <p className="font-semibold text-slate-800 mb-1">Expected CSV Column Order:</p>
          <code className="bg-slate-200 px-1.5 py-0.5 rounded font-mono text-[11px]">
            studentId, fullName, class, qrCodeValue, email
          </code>
          <p className="mt-1 text-slate-500">
            Example: <span className="font-mono">STU011, Alex Morgan, Grade 10, STU011, alex.m@smartattend.edu</span>
          </p>
        </div>

        {/* File input */}
        <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-indigo-500 transition-colors">
          <Upload className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="text-xs font-semibold text-slate-700">Choose a CSV file</p>
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer mt-3"
          />
        </div>

        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successCount !== null && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-lg border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>Successfully imported {successCount} student records!</span>
          </div>
        )}

        {parsedRows.length > 0 && successCount === null && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-slate-700">
              Preview ({parsedRows.length} students found):
            </p>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg text-xs divide-y divide-slate-100">
              {parsedRows.slice(0, 5).map((row, idx) => (
                <div key={idx} className="p-2 flex items-center justify-between">
                  <span className="font-mono font-bold text-indigo-600">{row.studentId}</span>
                  <span className="font-medium text-slate-800">{row.fullName}</span>
                  <span className="text-slate-500">{row.class}</span>
                </div>
              ))}
              {parsedRows.length > 5 && (
                <div className="p-2 text-center text-slate-400 italic">
                  + {parsedRows.length - 5} more students
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
          <Button variant="outline" onClick={onClose}>
            {successCount !== null ? "Close" : "Cancel"}
          </Button>
          {successCount === null && (
            <Button
              variant="primary"
              disabled={parsedRows.length === 0 || importing}
              isLoading={importing}
              onClick={handleExecuteImport}
            >
              Import {parsedRows.length} Students
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};