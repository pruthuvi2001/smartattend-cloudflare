"use client";

import React, { useState, useEffect } from "react";
import { ClassEntity, ClassScheduleEntry, DayOfWeek, DAYS_OF_WEEK } from "@/types/class";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Plus, Trash2, Clock, Calendar } from "lucide-react";

interface ClassScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  classEntity?: ClassEntity | null;
  onSave: (classData: { id?: string; name: string; schedules: ClassScheduleEntry[] }) => Promise<void>;
  isLoading?: boolean;
}

export const ClassScheduleModal: React.FC<ClassScheduleModalProps> = ({
  isOpen,
  onClose,
  classEntity,
  onSave,
  isLoading = false,
}) => {
  const [name, setName] = useState("");
  const [schedules, setSchedules] = useState<ClassScheduleEntry[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (classEntity) {
      setName(classEntity.name);
      setSchedules(classEntity.schedules || []);
    } else {
      setName("");
      setSchedules([
        {
          id: `sched-${Date.now()}`,
          dayOfWeek: "Saturday",
          startTime: "19:00",
          endTime: "21:00",
        },
      ]);
    }
    setError(null);
  }, [classEntity, isOpen]);

  const handleAddSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      {
        id: `sched-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        dayOfWeek: "Saturday",
        startTime: "19:00",
        endTime: "21:00",
      },
    ]);
  };

  const handleRemoveSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const handleScheduleChange = (
    id: string,
    field: keyof Omit<ClassScheduleEntry, "id">,
    val: string
  ) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: val } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Class name is required (e.g. 'Grade 6').");
      return;
    }

    // Validate schedules
    for (let i = 0; i < schedules.length; i++) {
      const s = schedules[i];
      if (!s.startTime || !s.endTime) {
        setError(`Please specify start and end times for session #${i + 1}.`);
        return;
      }
      if (s.startTime >= s.endTime) {
        setError(
          `Session #${i + 1} (${s.dayOfWeek}): Start time (${s.startTime}) must be before end time (${s.endTime}).`
        );
        return;
      }
    }

    try {
      await onSave({
        id: classEntity?.id,
        name: name.trim(),
        schedules,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save class schedules.");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={classEntity ? `Edit Class: ${classEntity.name}` : "Create New Class & Schedule"}
      description="Define the class name and recurring weekly sessions for automated attendance windows."
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-200">
            {error}
          </div>
        )}

        <div>
          <Input
            label="Class / Grade Name *"
            placeholder="e.g. Grade 6 or A/L Physics"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            helperText="Students will be assigned to this class name."
          />
        </div>

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                Weekly Scheduled Sessions ({schedules.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                Attendance must be marked within this window; otherwise students are automatically marked Absent.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddSchedule}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Add Session
            </Button>
          </div>

          {schedules.length === 0 ? (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center text-xs text-slate-500">
              No weekly sessions defined. Click &quot;Add Session&quot; to configure timetable windows.
            </div>
          ) : (
            <div className="space-y-2.5">
              {schedules.map((item, index) => (
                <div
                  key={item.id}
                  className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-600 shrink-0">
                    #{index + 1}
                  </div>

                  <div className="flex-1">
                    <Select
                      label="Day of Week"
                      value={item.dayOfWeek}
                      onChange={(e) =>
                        handleScheduleChange(item.id, "dayOfWeek", e.target.value as DayOfWeek)
                      }
                      options={DAYS_OF_WEEK.map((d) => ({ label: d, value: d }))}
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <Input
                      label="Start Time"
                      type="time"
                      value={item.startTime}
                      onChange={(e) => handleScheduleChange(item.id, "startTime", e.target.value)}
                      required
                    />
                  </div>

                  <div className="w-full sm:w-36">
                    <Input
                      label="End Time"
                      type="time"
                      value={item.endTime}
                      onChange={(e) => handleScheduleChange(item.id, "endTime", e.target.value)}
                      required
                    />
                  </div>

                  <div className="pt-6 sm:pt-5 shrink-0 flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveSchedule(item.id)}
                      className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                      title="Remove session"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Save Class & Schedules
          </Button>
        </div>
      </form>
    </Modal>
  );
};
