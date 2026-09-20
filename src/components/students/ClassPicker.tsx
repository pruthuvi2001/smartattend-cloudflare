"use client";

import React, { useState, useEffect } from "react";
import { ClassEntity } from "@/types/class";
import { getClasses } from "@/lib/classes/classService";
import { Check, BookOpen, Clock } from "lucide-react";

interface ClassPickerProps {
  selectedClassIds: string[];
  onChange: (selectedClassIds: string[], selectedDisplayNames: string[]) => void;
  error?: string | null;
}

export const ClassPicker: React.FC<ClassPickerProps> = ({
  selectedClassIds,
  onChange,
  error,
}) => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getClasses().then((list) => {
      setClasses(list);
      setLoading(false);
    });
  }, []);

  const handleToggleClass = (classItem: ClassEntity) => {
    let updatedIds: string[];
    let updatedNames: string[];

    if (selectedClassIds.includes(classItem.id)) {
      // Remove
      updatedIds = selectedClassIds.filter((id) => id !== classItem.id);
    } else {
      // Add
      updatedIds = [...selectedClassIds, classItem.id];
    }

    // Resolve names for all selected IDs
    const classMap = new Map(classes.map((c) => [c.id, c.name]));
    updatedNames = updatedIds.map((id) => classMap.get(id) || id);

    onChange(updatedIds, updatedNames);
  };

  if (loading) {
    return (
      <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-200">
        Loading dynamic classes from system settings...
      </div>
    );
  }

  if (classes.length === 0) {
    return (
      <div className="p-3 text-xs text-amber-700 bg-amber-50 rounded-xl border border-amber-200">
        No class entities configured. Please create classes in System Settings.
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        Enrolled Class(es) / Subjects *
      </label>
      <p className="text-[11px] text-slate-500 mb-2">
        Select one or more classes this student attends. Class schedules are managed in Settings.
      </p>

      {error && (
        <p className="text-xs text-rose-600 font-semibold mb-1">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1 p-1 bg-slate-50 border border-slate-200 rounded-xl">
        {classes.map((c) => {
          const isSelected = selectedClassIds.includes(c.id);

          return (
            <button
              key={c.id}
              type="button"
              onClick={() => handleToggleClass(c)}
              className={`p-2.5 rounded-lg border text-left transition-all flex items-center justify-between gap-2 ${
                isSelected
                  ? "bg-indigo-50 border-indigo-300 text-indigo-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-700 hover:border-slate-300"
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 font-semibold text-xs truncate">
                  <BookOpen className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className="truncate">{c.name}</span>
                </div>
                {c.schedules && c.schedules.length > 0 && (
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-0.5 truncate">
                    <Clock className="w-3 h-3 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {c.schedules.map((s) => `${s.dayOfWeek} ${s.startTime}`).join(", ")}
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isSelected
                    ? "bg-indigo-600 border-indigo-600 text-white"
                    : "border-slate-300 bg-white"
                }`}
              >
                {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
