/**
 * Firestore security rules tests — run against the LOCAL Firestore emulator only
 * (fake data, never the live database):   npm run test:rules
 */
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import fs from "fs";
import path from "path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, setDoc, updateDoc, writeBatch } from "firebase/firestore";

let env: RulesTestEnvironment;
const now = "2026-11-22T00:00:00.000Z";
const user = (userId: string, role: string, status = "ACTIVE") => ({
  userId,
  email: `${userId}@test.lk`,
  displayName: userId,
  role,
  status,
  createdAt: now,
  updatedAt: now,
});

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-smartattend-rules",
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8"), host: "127.0.0.1", port: 8181 },
  });
});
afterAll(async () => env?.cleanup());

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    for (const [id, role, status] of [
      ["admin1", "ADMIN", "ACTIVE"],
      ["admin2", "ADMIN", "ACTIVE"],
      ["principal1", "PRINCIPAL", "ACTIVE"],
      ["teacher1", "TEACHER", "ACTIVE"],
      ["staff1", "STAFF", "ACTIVE"],
      ["staff2", "STAFF", "ACTIVE"],
      ["viewer1", "VIEWER", "ACTIVE"],
      ["inactive1", "STAFF", "INACTIVE"],
    ]) {
      await setDoc(doc(db, "users", id), user(id, role, status));
    }
    // An old profile without a status field (should still count as active)
    await setDoc(doc(db, "users", "legacy1"), { userId: "legacy1", email: "l@test.lk", displayName: "Legacy", role: "STAFF" });
    await setDoc(doc(db, "students", "S1"), { studentId: "S1", fullName: "Student One", status: "ACTIVE" });
    await setDoc(doc(db, "attendance", "S1_2026-11-01"), { attendanceId: "S1_2026-11-01", studentId: "S1" });
    await setDoc(doc(db, "feeRecords", "S1_2026-11"), { feeRecordId: "S1_2026-11", studentId: "S1", totalPaid: 0 });
    await setDoc(doc(db, "classes", "grade-1"), { id: "grade-1", name: "Grade 1" });
    await setDoc(doc(db, "settings", "system"), { schoolName: "WISDOM" });
  });
});

const as = (uid: string) => env.authenticatedContext(uid).firestore();
const anon = () => env.unauthenticatedContext().firestore();
const savePerms = (roles: Record<string, string[]>) =>
  env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "settings", "rolePermissions"), { roles, updatedAt: now, updatedBy: "test", version: 1 });
  });
const ALL_STAFF_DEFAULT = [
  "dashboard_view", "attendance_scan", "attendance_view", "attendance_mark",
  "students_view", "students_create", "students_edit", "students_export",
  "payments_view", "payments_record", "payments_waive", "payments_export",
  "reports_view", "reports_export",
];

describe("closed security holes", () => {
  it("not signed in → nothing", async () => {
    await assertFails(getDoc(doc(anon(), "students", "S1")));
  });

  it("signed in but no profile → no data (was treated as ADMIN before)", async () => {
    await assertFails(getDoc(doc(as("stranger"), "students", "S1")));
    await assertFails(setDoc(doc(as("stranger"), "settings", "system"), { schoolName: "x" }));
  });

  it("inactive account → no data", async () => {
    await assertFails(getDoc(doc(as("inactive1"), "students", "S1")));
  });

  it("staff cannot make themselves ADMIN or re-activate themselves", async () => {
    await assertFails(updateDoc(doc(as("staff1"), "users", "staff1"), { role: "ADMIN" }));
    await assertFails(updateDoc(doc(as("inactive1"), "users", "inactive1"), { status: "ACTIVE" }));
    await assertSucceeds(updateDoc(doc(as("staff1"), "users", "staff1"), { displayName: "New name" }));
  });

  it("someone without a profile can only register as waiting-for-approval", async () => {
    await assertFails(setDoc(doc(as("newbie"), "users", "newbie"), user("newbie", "ADMIN", "ACTIVE")));
    await assertFails(setDoc(doc(as("newbie"), "users", "newbie"), user("newbie", "STAFF", "ACTIVE")));
    await assertSucceeds(setDoc(doc(as("newbie"), "users", "newbie"), user("newbie", "STAFF", "INACTIVE")));
    await assertFails(getDoc(doc(as("newbie"), "students", "S1")));
  });

  it("non-managers cannot read other users' accounts", async () => {
    await assertSucceeds(getDoc(doc(as("staff1"), "users", "staff1")));
    await assertFails(getDoc(doc(as("staff1"), "users", "admin1")));
    await assertFails(getDocs(collection(as("staff1"), "users")));
  });
});

describe("defaults = what each role could do before", () => {
  it("staff: read + register/edit students, attendance, payments; no deletes, settings or users", async () => {
    const db = as("staff1");
    await assertSucceeds(getDocs(collection(db, "students")));
    await assertSucceeds(setDoc(doc(db, "students", "S2"), { studentId: "S2", fullName: "Two" }));
    await assertSucceeds(updateDoc(doc(db, "students", "S1"), { fullName: "Student 1" }));
    await assertSucceeds(setDoc(doc(db, "attendance", "S1_2026-11-02"), { attendanceId: "S1_2026-11-02", studentId: "S1" }));
    await assertSucceeds(updateDoc(doc(db, "feeRecords", "S1_2026-11"), { totalPaid: 3500 }));
    await assertFails(deleteDoc(doc(db, "students", "S1")));
    await assertFails(deleteDoc(doc(db, "attendance", "S1_2026-11-01")));
    await assertFails(deleteDoc(doc(db, "feeRecords", "S1_2026-11")));
    await assertFails(setDoc(doc(db, "settings", "system"), { schoolName: "x" }));
    await assertFails(setDoc(doc(db, "classes", "new"), { id: "new" }).then(() => deleteDoc(doc(db, "classes", "grade-1"))));
  });

  it("teacher and principal behave like staff by default", async () => {
    for (const uid of ["teacher1", "principal1"]) {
      await assertSucceeds(setDoc(doc(as(uid), "attendance", `S1_${uid}`), { attendanceId: `S1_${uid}`, studentId: "S1" }));
      await assertFails(deleteDoc(doc(as(uid), "students", "S1")));
    }
  });

  it("legacy profile without status still works", async () => {
    await assertSucceeds(getDoc(doc(as("legacy1"), "students", "S1")));
  });

  it("viewer: read only", async () => {
    const db = as("viewer1");
    await assertSucceeds(getDoc(doc(db, "students", "S1")));
    await assertSucceeds(getDoc(doc(db, "feeRecords", "S1_2026-11")));
    await assertFails(updateDoc(doc(db, "students", "S1"), { fullName: "x" }));
    await assertFails(setDoc(doc(db, "attendance", "S1_x"), { studentId: "S1" }));
    await assertFails(updateDoc(doc(db, "feeRecords", "S1_2026-11"), { totalPaid: 1 }));
  });

  it("admin can do everything, incl. clear-all style deletes", async () => {
    const db = as("admin1");
    await assertSucceeds(deleteDoc(doc(db, "attendance", "S1_2026-11-01")));
    await assertSucceeds(deleteDoc(doc(db, "feeRecords", "S1_2026-11")));
    await assertSucceeds(deleteDoc(doc(db, "students", "S1")));
    await assertSucceeds(setDoc(doc(db, "settings", "system"), { schoolName: "WISDOM English Academy" }));
  });
});

describe("Role & Permission settings", () => {
  const valid = { roles: { PRINCIPAL: ALL_STAFF_DEFAULT, TEACHER: ["attendance_scan"], STAFF: ALL_STAFF_DEFAULT, VIEWER: [] }, updatedAt: now, updatedBy: "Admin", version: 1 };

  it("only an active admin can save them, and only valid content", async () => {
    await assertFails(setDoc(doc(as("staff1"), "settings", "rolePermissions"), valid));
    await assertFails(setDoc(doc(as("principal1"), "settings", "rolePermissions"), valid));
    await assertSucceeds(setDoc(doc(as("admin1"), "settings", "rolePermissions"), valid));
    await assertFails(setDoc(doc(as("admin1"), "settings", "rolePermissions"), { ...valid, roles: { ...valid.roles, STAFF: ["hack_all"] } }));
    await assertFails(setDoc(doc(as("admin1"), "settings", "rolePermissions"), { ...valid, roles: { ...valid.roles, ADMIN: [] } }));
    await assertFails(setDoc(doc(as("admin1"), "settings", "rolePermissions"), { ...valid, extra: true }));
    await assertFails(deleteDoc(doc(as("admin1"), "settings", "rolePermissions")));
  });

  it("taking a permission away blocks it immediately on the server", async () => {
    await savePerms({ PRINCIPAL: [], TEACHER: [], STAFF: ["reports_view"], VIEWER: [] });
    const db = as("staff1");
    await assertSucceeds(getDoc(doc(db, "students", "S1"))); // reports need the roster
    await assertFails(setDoc(doc(db, "students", "S3"), { studentId: "S3" }));
    await assertFails(setDoc(doc(db, "attendance", "S1_z"), { studentId: "S1" }));
    await assertFails(updateDoc(doc(db, "feeRecords", "S1_2026-11"), { totalPaid: 1 }));
    // A role with no permissions at all sees nothing
    await assertFails(getDoc(doc(as("teacher1"), "students", "S1")));
  });

  it("giving a permission allows it immediately", async () => {
    await savePerms({ PRINCIPAL: [], TEACHER: ["students_view", "students_delete"], STAFF: ["settings_manage"], VIEWER: [] });
    await assertSucceeds(deleteDoc(doc(as("teacher1"), "attendance", "S1_2026-11-01")));
    await assertSucceeds(deleteDoc(doc(as("teacher1"), "students", "S1")));
    await assertSucceeds(setDoc(doc(as("staff1"), "settings", "system"), { schoolName: "x" }));
  });

  it("scanner-only role can mark attendance but not see fees", async () => {
    await savePerms({ PRINCIPAL: [], TEACHER: ["attendance_scan"], STAFF: [], VIEWER: [] });
    const db = as("teacher1");
    await assertSucceeds(getDoc(doc(db, "students", "S1")));
    await assertSucceeds(setDoc(doc(db, "attendance", "S1_2026-11-03"), { attendanceId: "S1_2026-11-03", studentId: "S1" }));
    await assertFails(getDoc(doc(db, "feeRecords", "S1_2026-11")));
  });

  it("Change Student ID batch works only with that permission", async () => {
    const run = (uid: string) => {
      const db = as(uid);
      const b = writeBatch(db);
      b.set(doc(db, "students", "S9"), { studentId: "S9", fullName: "Student One" });
      b.set(doc(db, "attendance", "S9_2026-11-01"), { attendanceId: "S9_2026-11-01", studentId: "S9" });
      b.set(doc(db, "feeRecords", "S9_2026-11"), { feeRecordId: "S9_2026-11", studentId: "S9" });
      b.delete(doc(db, "attendance", "S1_2026-11-01"));
      b.delete(doc(db, "feeRecords", "S1_2026-11"));
      b.delete(doc(db, "students", "S1"));
      return b.commit();
    };
    await assertFails(run("staff1")); // not allowed by default
    await savePerms({ PRINCIPAL: [], TEACHER: [], STAFF: ["students_view", "students_change_id"], VIEWER: [] });
    await assertSucceeds(run("staff1"));
  });
});

describe("user management", () => {
  it("admin manages others but never their own role or status", async () => {
    await assertSucceeds(updateDoc(doc(as("admin1"), "users", "staff1"), { role: "TEACHER" }));
    await assertSucceeds(updateDoc(doc(as("admin1"), "users", "admin2"), { status: "INACTIVE" }));
    await assertFails(updateDoc(doc(as("admin1"), "users", "admin1"), { role: "STAFF" }));
    await assertFails(updateDoc(doc(as("admin1"), "users", "admin1"), { status: "INACTIVE" }));
    await assertFails(deleteDoc(doc(as("admin1"), "users", "admin1")));
    await assertSucceeds(deleteDoc(doc(as("admin1"), "users", "staff2")));
    await assertSucceeds(setDoc(doc(as("admin1"), "users", "new1"), user("new1", "ADMIN")));
  });

  it("a non-admin user manager cannot touch admins, create admins or edit themselves", async () => {
    await savePerms({ PRINCIPAL: ["users_manage"], TEACHER: [], STAFF: [], VIEWER: [] });
    const db = as("principal1");
    await assertSucceeds(getDocs(collection(db, "users")));
    await assertSucceeds(updateDoc(doc(db, "users", "staff1"), { role: "TEACHER" }));
    await assertSucceeds(setDoc(doc(db, "users", "new2"), user("new2", "STAFF")));
    await assertFails(setDoc(doc(db, "users", "new3"), user("new3", "ADMIN")));
    await assertFails(updateDoc(doc(db, "users", "staff1"), { role: "ADMIN" }));
    await assertFails(updateDoc(doc(db, "users", "admin1"), { status: "INACTIVE" }));
    await assertFails(deleteDoc(doc(db, "users", "admin1")));
    await assertFails(updateDoc(doc(db, "users", "principal1"), { role: "ADMIN" }));
    await assertFails(updateDoc(doc(db, "users", "principal1"), { status: "INACTIVE" }));
  });

  it("without users_manage nobody but admins can change accounts", async () => {
    await assertFails(updateDoc(doc(as("staff1"), "users", "staff2"), { role: "ADMIN" }));
    await assertFails(deleteDoc(doc(as("staff1"), "users", "staff2")));
  });
});
