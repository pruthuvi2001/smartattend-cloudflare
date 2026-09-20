"use client";

import React, { useState, useEffect } from "react";
import { ClassEntity, ClassScheduleEntry } from "@/types/class";
import { getClasses, saveClass, deleteClass } from "@/lib/classes/classService";
import { ClassScheduleModal } from "./ClassScheduleModal";
import { Button } from "@/components/ui/Button";
import { Plus, Edit2, Trash2, Clock, CalendarDays, BookOpen } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export const ClassScheduleManager: React.FC = () => {
  const [classes, setClasses] = useState<ClassEntity[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<ClassEntity | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadData = async () => {
    try {
      setLoading(true);
      const list = await getClasses();
      setClasses(list);
    } catch (err) {
      console.error("Failed to load classes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenAdd = () => {
    setSelectedClass(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: ClassEntity) => {
    setSelectedClass(c);
    setIsModalOpen(true);
  };

  const handleSave = async (data: { id?: string; name: string; schedules: ClassScheduleEntry[] }) => {
    try {
      setSaving(true);
      await saveClass(data);
      toast.success("Class Saved", `Schedule settings saved for ${data.name}.`);
      await loadData();
    } catch (err: any) {
      toast.error("Error Saving", err.message);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (classId: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteClass(classId);
      toast.info("Class Deleted", `Removed ${name} from class schedules.`);
      await loadData();
    } catch (err: any) {
      toast.error("Delete Error", err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Class Timetables &amp; Session Windows
          </h3>
          <p className="text-xs text-slate-500">
            Define recurring weekly sessions per class. If students are not marked within their session window, the system marks them absent.
          </p>
        </div>
        <Button
          size="sm"
          variant="primary"
          onClick={handleOpenAdd}
          leftIcon={<Plus className="w-4 h-4" />}
        >
          Add Class / Schedule
        </Button>
      </div>

      {loading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading class timetables...</div>
      ) : classes.length === 0 ? (
        <div className="p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 bg-slate-50">
          No classes configured yet. Click &quot;Add Class / Schedule&quot; above to create one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((c) => (
            <div
              key={c.id}
              className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-all shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{c.name}</span>
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                      {c.schedules?.length || 0} session{c.schedules?.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-indigo-50 transition-colors"
                      title="Edit class & schedule"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id, c.name)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete class"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5 mt-3">
                  {c.schedules && c.schedules.length > 0 ? (
                    c.schedules.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs py-1 px-2.5 rounded-lg bg-slate-50 border border-slate-100"
                      >
                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                          <CalendarDays className="w-3.5 h-3.5 text-slate-400" />
                          <span>{s.dayOfWeek}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>
                            {s.startTime} – {s.endTime}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-400 italic">No scheduled sessions</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ClassScheduleModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        classEntity={selectedClass}
        onSave={handleSave}
        isLoading={saving}
      />
    </div>
  );
};
