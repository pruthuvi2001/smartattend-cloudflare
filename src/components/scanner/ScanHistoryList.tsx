"use client";

import React from "react";
import { SessionScanItem } from "@/types/attendance";
import { CheckCircle2, AlertTriangle, XCircle, Clock, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

export interface ScanHistoryListProps {
  scans: SessionScanItem[];
  onClear: () => void;
}

export const ScanHistoryList: React.FC<ScanHistoryListProps> = ({ scans, onClear }) => {
  if (scans.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-5 text-center text-slate-500 text-xs">
        <Clock className="w-5 h-5 mx-auto mb-1.5 text-slate-400" />
        <p className="font-semibold text-slate-700">No scans in this session yet</p>
        <p className="mt-0.5">Scanned student records will appear here in real-time.</p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="py-3 px-4">
        <div className="flex items-center gap-2">
          <CardTitle className="text-sm">Session Scan Activity</CardTitle>
          <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
            {scans.length}
          </span>
        </div>
        <button
          onClick={onClear}
          title="Clear session list"
          className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Clear</span>
        </button>
      </CardHeader>
      <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto">
        {scans.map((item) => {
          const isSuccess = item.status === "SUCCESS";
          const isDup = item.status === "ALREADY_MARKED";

          return (
            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
                {isDup && <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />}
                {!isSuccess && !isDup && <XCircle className="w-5 h-5 text-rose-500 shrink-0" />}

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900 truncate">
                      {item.studentName || "Unregistered QR"}
                    </p>
                    {item.studentId && (
                      <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.studentId}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{item.message}</p>
                </div>
              </div>

              <div className="text-right shrink-0 ml-3">
                <span className="text-xs font-mono font-medium text-slate-600 block">{item.time}</span>
                <Badge
                  variant={isSuccess ? "success" : isDup ? "warning" : "danger"}
                  size="sm"
                  className="mt-0.5 text-[10px]"
                >
                  {isSuccess ? "MARKED" : isDup ? "DUPLICATE" : "FAILED"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};
