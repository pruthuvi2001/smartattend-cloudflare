/**
 * ─────────────────────────────────────────────────────────────────────────────
 *  ROLE & PERMISSION CATALOG  (single source of truth for the whole app)
 * ─────────────────────────────────────────────────────────────────────────────
 *  Every feature that a role can be allowed or denied is listed here.
 *  - The UI (menu, pages, buttons) checks these keys through useAuth().can().
 *  - firestore.rules checks the same keys on the server, so hiding a button is
 *    never the only protection.
 *  - The Admin edits which role gets which key on  /roles  (Role & Permissions).
 *    The choice is saved in Firestore at  settings/rolePermissions.
 *
 *  ADMIN always has every permission and cannot be edited (so the academy can
 *  never be locked out). Two abilities are ADMIN-only and not configurable:
 *  Role & Permission Management and "Clear All Data".
 *
 *  If you add a key here, also add it to ALL_PERMISSIONS in firestore.rules
 *  (a unit test checks that both lists match).
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { UserRole } from "@/types/user";

export type Permission =
  | "dashboard_view"
  | "attendance_scan"
  | "attendance_view"
  | "attendance_mark"
  | "students_view"
  | "students_create"
  | "students_edit"
  | "students_change_id"
  | "students_delete"
  | "students_export"
  | "payments_view"
  | "payments_record"
  | "payments_waive"
  | "payments_export"
  | "reports_view"
  | "reports_export"
  | "classes_manage"
  | "settings_manage"
  | "users_manage";

export interface PermissionDef {
  key: Permission;
  label: string;
  description: string;
  /** Shown as a warning badge: gives access to money or can remove data. */
  sensitive?: boolean;
}

export interface PermissionCategory {
  id: string;
  label: string;
  permissions: PermissionDef[];
}

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    permissions: [
      { key: "dashboard_view", label: "View Dashboard", description: "Today's attendance summary and quick statistics." },
    ],
  },
  {
    id: "attendance",
    label: "Attendance Management",
    permissions: [
      { key: "attendance_scan", label: "Attendance Scanner", description: "Mark attendance by scanning student QR cards." },
      { key: "attendance_view", label: "View Attendance Records", description: "See daily attendance lists for any date." },
      { key: "attendance_mark", label: "Mark / Edit Attendance Manually", description: "Mark a student present, late or absent by hand; also runs the automatic absence marking." },
    ],
  },
  {
    id: "students",
    label: "Student Management",
    permissions: [
      { key: "students_view", label: "View Students", description: "Student directory, student profiles, QR ID badges and their history." },
      { key: "students_create", label: "Register Students", description: "Add new students, including CSV import." },
      { key: "students_edit", label: "Edit Student Details", description: "Change details, classes, email and active / inactive status." },
      { key: "students_change_id", label: "Change Student ID", description: "Move a student and all their attendance and fee history to a new ID.", sensitive: true },
      { key: "students_delete", label: "Delete Students", description: "Permanently remove a student with their attendance and fee records.", sensitive: true },
      { key: "students_export", label: "Export Student List", description: "Download the student roster as CSV." },
    ],
  },
  {
    id: "payments",
    label: "Payment & Finance Management",
    permissions: [
      { key: "payments_view", label: "View Payments", description: "Monthly Payments and Payment Records pages, fee status of each student." },
      { key: "payments_record", label: "Record Payments", description: "Record fee payments (payments pages, scanner, student profile).", sensitive: true },
      { key: "payments_waive", label: "Waive Fees", description: "Mark a month's fee as waived with a reason.", sensitive: true },
      { key: "payments_export", label: "Export Payment Reports", description: "Download payment lists as CSV / PDF." },
    ],
  },
  {
    id: "reports",
    label: "Reports & Analytics",
    permissions: [
      { key: "reports_view", label: "View Reports", description: "Attendance and fee reports." },
      { key: "reports_export", label: "Export Reports", description: "Download reports as CSV / PDF." },
    ],
  },
  {
    id: "classes",
    label: "Class & Timetable Management",
    permissions: [
      { key: "classes_manage", label: "Manage Classes & Timetables", description: "Create, edit and delete classes and their weekly schedules." },
    ],
  },
  {
    id: "settings",
    label: "System Settings",
    permissions: [
      { key: "settings_manage", label: "System Settings", description: "Academy name, timezone, attendance cut-off time, default fee, currency." },
    ],
  },
  {
    id: "users",
    label: "User Management",
    permissions: [
      {
        key: "users_manage",
        label: "Manage Users",
        description: "Add staff accounts, change roles, activate / deactivate users. Cannot touch Admin accounts or their own account.",
        sensitive: true,
      },
    ],
  },
];

export const ALL_PERMISSIONS: Permission[] = PERMISSION_CATEGORIES.flatMap((c) => c.permissions.map((p) => p.key));

/** Abilities only an ADMIN has. They are listed on the Roles page but cannot be granted. */
export const ADMIN_ONLY_ABILITIES = [
  { label: "Role & Permission Management", description: "Decide what every role can do." },
  { label: "Clear All Data", description: "Wipe all students, attendance and fee records." },
];

/** Roles whose permissions the Admin can edit (ADMIN itself is always full access). */
export const CONFIGURABLE_ROLES: Exclude<UserRole, "ADMIN">[] = ["PRINCIPAL", "TEACHER", "STAFF", "VIEWER"];

export const ROLE_LABELS: Record<UserRole, { label: string; description: string }> = {
  ADMIN: { label: "Admin", description: "Full access to everything. Cannot be restricted." },
  PRINCIPAL: { label: "Principal", description: "Academy head." },
  TEACHER: { label: "Teacher", description: "Teaching staff." },
  STAFF: { label: "Staff", description: "Office and front-desk staff." },
  VIEWER: { label: "Viewer", description: "Read-only access." },
};

/**
 * What each role could do BEFORE this feature existed. Used until the Admin saves
 * permissions for the first time, so nothing changes for anybody on day one.
 * (Must match DEFAULT lists in firestore.rules — a unit test checks this.)
 */
const STAFF_DEFAULT: Permission[] = [
  "dashboard_view",
  "attendance_scan",
  "attendance_view",
  "attendance_mark",
  "students_view",
  "students_create",
  "students_edit",
  "students_export",
  "payments_view",
  "payments_record",
  "payments_waive",
  "payments_export",
  "reports_view",
  "reports_export",
];

const VIEWER_DEFAULT: Permission[] = [
  "dashboard_view",
  "attendance_view",
  "students_view",
  "students_export",
  "payments_view",
  "payments_export",
  "reports_view",
  "reports_export",
];

export type RolePermissionMap = Record<Exclude<UserRole, "ADMIN">, Permission[]>;

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionMap = {
  PRINCIPAL: [...STAFF_DEFAULT],
  TEACHER: [...STAFF_DEFAULT],
  STAFF: [...STAFF_DEFAULT],
  VIEWER: [...VIEWER_DEFAULT],
};

/** The document stored at settings/rolePermissions. */
export interface RolePermissionsDoc {
  roles: RolePermissionMap;
  updatedAt: string;
  updatedBy: string;
  version: number;
}

const isPermission = (p: unknown): p is Permission => typeof p === "string" && (ALL_PERMISSIONS as string[]).includes(p);

/** Clean up whatever is stored (unknown keys dropped, missing roles get no access). */
export function normalizeRoleMap(raw: unknown): RolePermissionMap {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const out = {} as RolePermissionMap;
  for (const role of CONFIGURABLE_ROLES) {
    const list = Array.isArray(src[role]) ? (src[role] as unknown[]) : [];
    out[role] = ALL_PERMISSIONS.filter((p) => list.includes(p)); // catalog order, no duplicates
  }
  return out;
}

/**
 * Permissions a user actually has.
 * @param stored  the saved role map, or null when the Admin has never saved one (defaults apply)
 */
export function permissionsFor(role: UserRole | undefined | null, stored: RolePermissionMap | null): Set<Permission> {
  if (!role) return new Set();
  if (role === "ADMIN") return new Set(ALL_PERMISSIONS);
  const map = stored ?? DEFAULT_ROLE_PERMISSIONS;
  return new Set((map[role] ?? []).filter(isPermission));
}

/** Which page each menu item needs (any one of the listed permissions opens it). */
export const PAGE_PERMISSIONS: Record<string, Permission[]> = {
  "/dashboard": ["dashboard_view"],
  "/attendance/scan": ["attendance_scan"],
  "/attendance": ["attendance_view", "attendance_mark"],
  "/students": ["students_view"],
  "/monthly-payments": ["payments_view"],
  "/payment-records": ["payments_view"],
  "/reports": ["reports_view"],
  "/settings": ["settings_manage", "classes_manage"],
  "/users": ["users_manage"],
};

/** Order in which to send a user after login / when they open a page they cannot use. */
const LANDING_ORDER = ["/dashboard", "/attendance/scan", "/attendance", "/students", "/monthly-payments", "/payment-records", "/reports", "/settings", "/users"];

export function firstAllowedPage(perms: Set<Permission>, isAdmin: boolean): string | null {
  if (isAdmin) return "/dashboard";
  return LANDING_ORDER.find((page) => PAGE_PERMISSIONS[page].some((p) => perms.has(p))) ?? null;
}

/** Human-readable summary of what changed, used in the save confirmation. */
export function diffRoleMaps(before: RolePermissionMap, after: RolePermissionMap) {
  const changes: { role: Exclude<UserRole, "ADMIN">; granted: Permission[]; revoked: Permission[] }[] = [];
  for (const role of CONFIGURABLE_ROLES) {
    const b = new Set(before[role]);
    const a = new Set(after[role]);
    const granted = ALL_PERMISSIONS.filter((p) => a.has(p) && !b.has(p));
    const revoked = ALL_PERMISSIONS.filter((p) => b.has(p) && !a.has(p));
    if (granted.length || revoked.length) changes.push({ role, granted, revoked });
  }
  return changes;
}

export const permissionLabel = (key: Permission) =>
  PERMISSION_CATEGORIES.flatMap((c) => c.permissions).find((p) => p.key === key)?.label ?? key;
