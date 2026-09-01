"use client";

import React from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { formatMonthName, getPreviousMonthKey, getNextMonthKey } from "@/lib/payments/paymentService";
import { Button } from "@/components/ui/Button";

export interface MonthSelectorProps {
  selectedMonthKey: string;
  onMonthChange: (newMonthKey: string) => void;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({
  selectedMonthKey,
  onMonthChange,
}) => {
  const monthName = formatMonthName(selectedMonthKey);
  const prevKey = getPreviousMonthKey(selectedMonthKey);
  const nextKey = getNextMonthKey(selectedMonthKey);

  return (
    <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
      <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-start">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onMonthChange(prevKey)}
          className="text-xs h-9 px-2.5 text-slate-600 hover:text-slate-900"
          title={`Go to ${formatMonthName(prevKey)}`}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">{formatMonthName(prevKey)}</span>
        </Button>

        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-950 font-bold text-sm sm:text-base">
          <Calendar className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{monthName}</span>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => onMonthChange(nextKey)}
          className="text-xs h-9 px-2.5 text-slate-600 hover:text-slate-900"
          title={`Go to ${formatMonthName(nextKey)}`}
        >
          <span className="hidden sm:inline">{formatMonthName(nextKey)}</span>
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
        <label className="text-xs font-semibold text-slate-500 hidden md:inline">Jump to:</label>
        <input
          type="month"
          value={selectedMonthKey}
          onChange={(e) => {
            if (e.target.value) onMonthChange(e.target.value);
          }}
          className="text-xs font-semibold bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>
    </div>
  );
};
