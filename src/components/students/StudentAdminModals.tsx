"use client";

/**
 * Admin-only dialogs for the Student Directory:
 *  - ChangeStudentIdModal: fix a wrong Student ID (moves attendance + fee history too)
 *  - DeleteStudentModal:   permanently remove a student added by mistake
 */
import React, { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Student } from "@/types/student";
import {
  StudentRecordCounts,
  changeStudentId,
  deleteStudentAndRecords,
  getStudentRecordCounts,
  normalizeStudentId,
  remapQrValue,
  validateNewStudentId,
} from "@/lib/students/studentAdminService";
import { AlertTriangle, IdCard, Trash2 } from "lucide-react";

function useRecordCounts(student: Student | null) {
  const [counts, setCounts] = useState<StudentRecordCounts | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setCounts(null);
    setError(null);
    if (!student) return;
    let alive = true;
    getStudentRecordCounts(student.studentId)
      .then((c) => alive && setCounts(c))
      .catch((e) => alive && setError(e.message));
    return () => {
      alive = false;
    };
  }, [student]);
  return { counts, error };
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

// ───────────────────────────── Change Student ID ─────────────────────────────

export const ChangeStudentIdModal: React.FC<{
  student: Student | null;
  onClose: () => void;
  onDone: (message: { title: string; text: string; reprint: boolean }) => void;
  onError: (message: string) => void;
}> = ({ student, onClose, onDone, onError }) => {
  const [newId, setNewId] = useState("");
  const [busy, setBusy] = useState(false);
  const { counts, error } = useRecordCounts(student);

  useEffect(() => setNewId(""), [student]);

  if (!student) return null;
  const oldId = normalizeStudentId(student.studentId);
  const cleaned = normalizeStudentId(newId);
  const problem = newId ? validateNewStudentId(oldId, newId) : null;
  const qrWillChange = !!cleaned && !problem && remapQrValue(student.qrCodeValue, oldId, cleaned).changed;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleaned || problem || busy) return;
    setBusy(true);
    try {
      const res = await changeStudentId(oldId, cleaned);
      onDone({
        title: "Student ID changed",
        text:
          `${student.fullName}: ${oldId} → ${res.student.studentId}. Moved ${plural(res.moved.attendance, "attendance record")} ` +
          `and ${plural(res.moved.feeRecords, "fee record")}.` +
          (res.qrChanged ? " Please print a new QR ID card — the old card will not scan any more." : ""),
        reprint: res.qrChanged,
      });
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={!!student}
      onClose={busy ? () => {} : onClose}
      title="Change Student ID"
      description={`${student.fullName} — current ID ${oldId}`}
      maxWidth="md"
    >
      <form onSubmit={submit} className="space-y-4">
        <Input
          label="New Student ID"
          value={newId}
          onChange={(e) => setNewId(e.target.value.toUpperCase())}
          placeholder="e.g. WIS-2026-014"
          autoFocus
          autoComplete="off"
          error={problem || undefined}
          leftIcon={<IdCard className="w-4 h-4" />}
        />

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1.5">
          <p className="font-semibold text-slate-800">What will happen</p>
          {error ? (
            <p className="text-rose-600">{error}</p>
          ) : counts ? (
            <p>
              The student and their {plural(counts.attendance, "attendance record")} and{" "}
              {plural(counts.feeRecords, "fee record")} ({plural(counts.payments, "payment")}) move to the new ID. Nothing is lost.
            </p>
          ) : (
            <p>Counting this student&apos;s records…</p>
          )}
          {qrWillChange && (
            <p className="flex gap-1.5 text-amber-700">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              The QR code contains the ID, so it will change too. Print a new ID card afterwards — the old card will stop scanning.
            </p>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={busy} disabled={!cleaned || !!problem || !!error || !counts}>
            Change ID
          </Button>
        </div>
      </form>
    </Modal>
  );
};

// ─────────────────────────────── Delete Student ───────────────────────────────

export const DeleteStudentModal: React.FC<{
  student: Student | null;
  onClose: () => void;
  onDeactivateInstead: (student: Student) => void;
  onDone: (message: { title: string; text: string }) => void;
  onError: (message: string) => void;
}> = ({ student, onClose, onDeactivateInstead, onDone, onError }) => {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const { counts, error } = useRecordCounts(student);

  useEffect(() => setTyped(""), [student]);

  if (!student) return null;
  const id = normalizeStudentId(student.studentId);
  const confirmed = normalizeStudentId(typed) === id;
  const hasHistory = !!counts && (counts.attendance > 0 || counts.feeRecords > 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed || busy) return;
    setBusy(true);
    try {
      const res = await deleteStudentAndRecords(id);
      onDone({
        title: "Student deleted",
        text: `${student.fullName} (${id}) was removed with ${plural(res.attendance, "attendance record")} and ${plural(res.feeRecords, "fee record")}.`,
      });
    } catch (err: any) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={!!student} onClose={busy ? () => {} : onClose} title="Delete student permanently" description={`${student.fullName} — ${id}`} maxWidth="md">
      <form onSubmit={submit} className="space-y-4">
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 space-y-1.5">
          <p className="flex gap-1.5 font-semibold">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            This cannot be undone.
          </p>
          {error ? (
            <p>{error}</p>
          ) : counts ? (
            <p>
              This removes the student and {plural(counts.attendance, "attendance record")} and{" "}
              {plural(counts.feeRecords, "fee record")} ({plural(counts.payments, "payment")}).
            </p>
          ) : (
            <p>Counting this student&apos;s records…</p>
          )}
        </div>

        {hasHistory && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
            This student already has attendance or payment history. If they simply left the academy, you can{" "}
            <button type="button" className="font-semibold underline" onClick={() => onDeactivateInstead(student)}>
              mark them inactive instead
            </button>{" "}
            and keep the history.
          </div>
        )}

        <Input
          label={`Type ${id} to confirm`}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          placeholder={id}
        />

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="danger"
            isLoading={busy}
            disabled={!confirmed || !!error || !counts}
            leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          >
            Delete student
          </Button>
        </div>
      </form>
    </Modal>
  );
};
