import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  ALL_PERMISSIONS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PAGE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  diffRoleMaps,
  firstAllowedPage,
  normalizeRoleMap,
  permissionsFor,
} from "../src/lib/auth/permissions";
import { validateRoleMap } from "../src/lib/auth/rolePermissionsService";
import { fromFirestoreValue } from "../src/lib/auth/serverAuth";

const rules = fs.readFileSync(path.resolve(__dirname, "../firestore.rules"), "utf8");
/** Read the quoted list returned by a function in firestore.rules. */
function rulesList(fn: string): string[] {
  const m = rules.match(new RegExp(`function ${fn}\\(\\)\\s*\\{\\s*return \\[([^\\]]*)\\]`));
  if (!m) throw new Error(`function ${fn} not found in firestore.rules`);
  return Array.from(m[1].matchAll(/'([a-z_]+)'/g)).map((x) => x[1]);
}

describe("permission catalog", () => {
  it("has unique keys and every category is non-empty", () => {
    expect(new Set(ALL_PERMISSIONS).size).toBe(ALL_PERMISSIONS.length);
    PERMISSION_CATEGORIES.forEach((c) => expect(c.permissions.length).toBeGreaterThan(0));
  });

  it("matches the lists in firestore.rules exactly", () => {
    expect(rulesList("allPermissions").sort()).toEqual([...ALL_PERMISSIONS].sort());
    expect(rulesList("staffDefault").sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.STAFF].sort());
    expect(rulesList("viewerDefault").sort()).toEqual([...DEFAULT_ROLE_PERMISSIONS.VIEWER].sort());
    expect(DEFAULT_ROLE_PERMISSIONS.TEACHER).toEqual(DEFAULT_ROLE_PERMISSIONS.STAFF);
    expect(DEFAULT_ROLE_PERMISSIONS.PRINCIPAL).toEqual(DEFAULT_ROLE_PERMISSIONS.STAFF);
  });

  it("every page needs only known permissions", () => {
    Object.values(PAGE_PERMISSIONS).flat().forEach((p) => expect(ALL_PERMISSIONS).toContain(p));
  });
});

describe("defaults keep today's behaviour", () => {
  it("staff-type roles keep everything they could do before, but not admin-only actions", () => {
    for (const role of ["STAFF", "TEACHER", "PRINCIPAL"] as const) {
      const p = permissionsFor(role, null);
      ["attendance_scan", "students_create", "students_edit", "payments_record", "payments_waive", "reports_export"].forEach((k) =>
        expect(p.has(k as any)).toBe(true)
      );
      ["students_delete", "students_change_id", "users_manage", "settings_manage", "classes_manage"].forEach((k) =>
        expect(p.has(k as any)).toBe(false)
      );
    }
  });

  it("viewer cannot change anything", () => {
    const p = permissionsFor("VIEWER", null);
    ["attendance_scan", "attendance_mark", "students_create", "students_edit", "payments_record", "payments_waive"].forEach((k) =>
      expect(p.has(k as any)).toBe(false)
    );
  });

  it("admin always has everything, whatever is saved", () => {
    const none = normalizeRoleMap({});
    expect(permissionsFor("ADMIN", none).size).toBe(ALL_PERMISSIONS.length);
  });
});

describe("saved permissions", () => {
  it("are used instead of the defaults", () => {
    const saved = normalizeRoleMap({ STAFF: ["reports_view"], TEACHER: [], PRINCIPAL: ALL_PERMISSIONS, VIEWER: [] });
    expect([...permissionsFor("STAFF", saved)]).toEqual(["reports_view"]);
    expect(permissionsFor("TEACHER", saved).size).toBe(0);
    expect(permissionsFor("PRINCIPAL", saved).size).toBe(ALL_PERMISSIONS.length);
  });

  it("drop unknown keys and roles, and validation rejects them", () => {
    const m = normalizeRoleMap({ STAFF: ["reports_view", "hack_everything"], ADMIN: [], GHOST: ["x"] });
    expect(m.STAFF).toEqual(["reports_view"]);
    expect(Object.keys(m).sort()).toEqual([...CONFIGURABLE_ROLES].sort());
    expect(validateRoleMap({ ...m, STAFF: ["nope" as any] })).toMatch(/Unknown permission/);
    expect(validateRoleMap(m)).toBeNull();
  });

  it("no role at all → no access", () => {
    expect(permissionsFor(undefined, null).size).toBe(0);
  });
});

describe("helpers", () => {
  it("diffRoleMaps lists grants and revokes per role", () => {
    const before = normalizeRoleMap(DEFAULT_ROLE_PERMISSIONS);
    const after = normalizeRoleMap({ ...DEFAULT_ROLE_PERMISSIONS, STAFF: [...DEFAULT_ROLE_PERMISSIONS.STAFF.filter((p) => p !== "payments_waive"), "students_delete"] });
    expect(diffRoleMaps(before, after)).toEqual([{ role: "STAFF", granted: ["students_delete"], revoked: ["payments_waive"] }]);
    expect(diffRoleMaps(before, before)).toEqual([]);
  });

  it("firstAllowedPage sends a scanner-only role to the scanner", () => {
    expect(firstAllowedPage(new Set(["attendance_scan"]), false)).toBe("/attendance/scan");
    expect(firstAllowedPage(new Set(), false)).toBeNull();
    expect(firstAllowedPage(new Set(), true)).toBe("/dashboard");
  });

  it("reads Firestore REST values used by the API check", () => {
    expect(
      fromFirestoreValue({
        mapValue: { fields: { STAFF: { arrayValue: { values: [{ stringValue: "reports_view" }] } }, VIEWER: { arrayValue: {} } } },
      })
    ).toEqual({ STAFF: ["reports_view"], VIEWER: [] });
  });
});
