import { describe, it, expect, vi, beforeEach } from "vitest";

/* ───────────── In-memory fake Firestore (no real database is touched) ───────────── */
type Store = Record<string, Map<string, any>>;
const fake = vi.hoisted(() => {
  const state = { store: {} as Record<string, Map<string, any>>, failCommitAt: -1, commits: 0 };
  const col = (name: string) => (state.store[name] ??= new Map());
  return { state, col };
});

vi.mock("@/lib/firebase/config", () => ({ db: {}, auth: {}, isDemoMode: false }));
vi.mock("../src/lib/firebase/config", () => ({ db: {}, auth: {}, isDemoMode: false }));
vi.mock("firebase/firestore", () => {
  const { state, col } = fake;
  return {
    collection: (_db: unknown, name: string) => ({ name }),
    doc: (_db: unknown, name: string, id: string) => ({ name, id }),
    where: (field: string, _op: string, value: unknown) => ({ field, value }),
    query: (c: { name: string }, w: { field: string; value: unknown }) => ({ name: c.name, w }),
    getDoc: async (ref: { name: string; id: string }) => {
      const data = col(ref.name).get(ref.id);
      return { exists: () => data !== undefined, data: () => structuredClone(data) };
    },
    getDocs: async (q: { name: string; w: { field: string; value: unknown } }) => {
      const docs = Array.from(col(q.name).entries())
        .filter(([, d]) => d[q.w.field] === q.w.value)
        .map(([id, d]) => ({ id, data: () => structuredClone(d) }));
      return { docs, empty: docs.length === 0 };
    },
    writeBatch: () => {
      const ops: (() => void)[] = [];
      return {
        set: (ref: { name: string; id: string }, data: any) => ops.push(() => col(ref.name).set(ref.id, structuredClone(data))),
        delete: (ref: { name: string; id: string }) => ops.push(() => col(ref.name).delete(ref.id)),
        commit: async () => {
          if (state.commits++ === state.failCommitAt) throw Object.assign(new Error("network down"), { code: "unavailable" });
          ops.forEach((op) => op()); // a batch is all-or-nothing
        },
      };
    },
  };
});

import {
  changeStudentId,
  deleteStudentAndRecords,
  getStudentRecordCounts,
  planStudentIdChange,
  remapDocId,
  remapQrValue,
  validateNewStudentId,
} from "../src/lib/students/studentAdminService";

const student = (id: string, qr = `{"std_ID":"${id}"}`) => ({
  studentId: id,
  fullName: "Test Student",
  classIds: ["grade-10"],
  email: "s@example.com",
  qrCodeValue: qr,
  status: "ACTIVE" as const,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

function seed() {
  fake.state.store = {} as Store;
  fake.state.commits = 0;
  fake.state.failCommitAt = -1;
  fake.col("students").set("WRONG01", student("WRONG01"));
  fake.col("students").set("OTHER", student("OTHER"));
  fake.col("attendance").set("WRONG01_2026-11-01", { attendanceId: "WRONG01_2026-11-01", studentId: "WRONG01", date: "2026-11-01" });
  fake.col("attendance").set("WRONG01_2026-11-02", { attendanceId: "WRONG01_2026-11-02", studentId: "WRONG01", date: "2026-11-02" });
  fake.col("attendance").set("OTHER_2026-11-01", { attendanceId: "OTHER_2026-11-01", studentId: "OTHER", date: "2026-11-01" });
  fake.col("feeRecords").set("WRONG01_2026-11", {
    feeRecordId: "WRONG01_2026-11",
    studentId: "WRONG01",
    totalPaid: 3000,
    transactions: [{ paymentId: "p1", feeRecordId: "WRONG01_2026-11", studentId: "WRONG01", amount: 3000 }],
  });
}

/* ─────────────────────────────── pure helpers ─────────────────────────────── */
describe("student ID helpers", () => {
  it("validates new IDs", () => {
    expect(validateNewStudentId("STU1", "")).toMatch(/enter/);
    expect(validateNewStudentId("STU1", " stu1 ")).toMatch(/same/);
    expect(validateNewStudentId("STU1", "STU/2")).toMatch(/only letters/);
    expect(validateNewStudentId("STU1", "STU 2")).toMatch(/only letters/);
    expect(validateNewStudentId("STU1", "wis-2026_01")).toBeNull();
  });

  it("remaps QR values that carry the old ID and keeps custom ones", () => {
    expect(remapQrValue('{"std_ID":"OLD1"}', "OLD1", "NEW1")).toEqual({ value: '{"std_ID":"NEW1"}', changed: true });
    expect(remapQrValue("OLD1", "OLD1", "NEW1")).toEqual({ value: "NEW1", changed: true });
    expect(remapQrValue("CARD-778", "OLD1", "NEW1")).toEqual({ value: "CARD-778", changed: false });
  });

  it("renames document IDs only when they start with the old ID", () => {
    expect(remapDocId("OLD1_2026-11-01", "OLD1", "NEW1")).toBe("NEW1_2026-11-01");
    expect(remapDocId("OLD10_2026-11-01", "OLD1", "NEW1")).toBe("OLD10_2026-11-01");
    expect(remapDocId("random-id", "OLD1", "NEW1")).toBe("random-id");
  });

  it("plans copies before removals", () => {
    seed();
    const plan = planStudentIdChange(student("WRONG01"), "RIGHT01", [], []);
    expect(plan.additions.every((o) => o.kind === "set")).toBe(true);
    expect(plan.finalize.at(-1)).toEqual({ kind: "delete", col: "students", id: "WRONG01" });
  });
});

/* ───────────────────────────── full flows (fake DB) ───────────────────────────── */
describe("changeStudentId", () => {
  beforeEach(seed);

  it("moves the student, attendance and fee history to the new ID", async () => {
    const res = await changeStudentId("WRONG01", "right01");
    expect(res.moved).toEqual({ attendance: 2, feeRecords: 1, payments: 1 });
    expect(res.qrChanged).toBe(true);

    const s = fake.col("students");
    expect(s.has("WRONG01")).toBe(false);
    expect(s.get("RIGHT01")).toMatchObject({ studentId: "RIGHT01", qrCodeValue: '{"std_ID":"RIGHT01"}', fullName: "Test Student" });

    const a = fake.col("attendance");
    expect(Array.from(a.keys()).sort()).toEqual(["OTHER_2026-11-01", "RIGHT01_2026-11-01", "RIGHT01_2026-11-02"]);
    expect(a.get("RIGHT01_2026-11-01")).toMatchObject({ attendanceId: "RIGHT01_2026-11-01", studentId: "RIGHT01" });

    const f = fake.col("feeRecords").get("RIGHT01_2026-11");
    expect(f).toMatchObject({ feeRecordId: "RIGHT01_2026-11", studentId: "RIGHT01", totalPaid: 3000 });
    expect(f.transactions[0]).toMatchObject({ feeRecordId: "RIGHT01_2026-11", studentId: "RIGHT01", amount: 3000 });
    expect(fake.col("feeRecords").has("WRONG01_2026-11")).toBe(false);

    // other students untouched
    expect(s.get("OTHER")).toMatchObject({ studentId: "OTHER" });
  });

  it("refuses an ID that another student already uses", async () => {
    await expect(changeStudentId("WRONG01", "OTHER")).rejects.toThrow(/already uses the ID/);
    expect(fake.col("students").has("WRONG01")).toBe(true);
  });

  it("refuses when old records already exist under the new ID", async () => {
    fake.col("attendance").set("GHOST_2026-01-01", { attendanceId: "GHOST_2026-01-01", studentId: "GHOST" });
    await expect(changeStudentId("WRONG01", "GHOST")).rejects.toThrow(/already .* saved under/);
  });

  it("leaves the old ID exactly as it was if the copy fails", async () => {
    const before = JSON.stringify(Object.entries(fake.state.store).map(([k, m]) => [k, Array.from(m.entries())]));
    fake.state.failCommitAt = 0; // first batch (the copy) fails
    await expect(changeStudentId("WRONG01", "RIGHT01")).rejects.toThrow(/nothing was changed/);
    const after = JSON.stringify(Object.entries(fake.state.store).map(([k, m]) => [k, Array.from(m.entries())]));
    expect(after).toBe(before);
  });
});

describe("deleteStudentAndRecords", () => {
  beforeEach(seed);

  it("counts records before deleting", async () => {
    expect(await getStudentRecordCounts("wrong01")).toEqual({ attendance: 2, feeRecords: 1, payments: 1 });
  });

  it("removes only that student and their records", async () => {
    const res = await deleteStudentAndRecords("WRONG01");
    expect(res).toEqual({ attendance: 2, feeRecords: 1, payments: 1 });
    expect(fake.col("students").has("WRONG01")).toBe(false);
    expect(Array.from(fake.col("attendance").keys())).toEqual(["OTHER_2026-11-01"]);
    expect(fake.col("feeRecords").size).toBe(0);
    expect(fake.col("students").has("OTHER")).toBe(true);
  });

  it("keeps the student if the delete fails", async () => {
    fake.state.failCommitAt = 0;
    await expect(deleteStudentAndRecords("WRONG01")).rejects.toThrow(/Could not delete/);
    expect(fake.col("students").has("WRONG01")).toBe(true);
  });
});
