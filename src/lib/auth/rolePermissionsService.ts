/**
 * Reads and saves the Role & Permission settings (Firestore: settings/rolePermissions).
 * This is ONE small settings document; it never touches student, attendance or fee data.
 * Only ADMIN users can save it (enforced by firestore.rules).
 */
import { doc, onSnapshot, setDoc, Unsubscribe } from "firebase/firestore";
import { db, isDemoMode } from "../firebase/config";
import {
  ALL_PERMISSIONS,
  CONFIGURABLE_ROLES,
  RolePermissionMap,
  RolePermissionsDoc,
  normalizeRoleMap,
} from "./permissions";

export const ROLE_PERMISSIONS_DOC = { collection: "settings", id: "rolePermissions" } as const;
const LOCAL_KEY = "smartattend_role_permissions"; // demo mode / offline copy only

function readLocal(): RolePermissionMap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizeRoleMap(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

function writeLocal(map: RolePermissionMap | null) {
  if (typeof window === "undefined") return;
  try {
    if (map) localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
    else localStorage.removeItem(LOCAL_KEY);
  } catch {
    /* optional */
  }
}

/**
 * Live subscription: calls back with the saved role map, or null when the Admin
 * has never saved one (then the built-in defaults apply). Changes made by the Admin
 * reach every open browser within seconds — nobody has to log out.
 */
export function subscribeRolePermissions(
  onChange: (map: RolePermissionMap | null) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  if (isDemoMode) {
    onChange(readLocal());
    const listener = () => onChange(readLocal());
    window.addEventListener("smartattend:role-permissions", listener);
    return () => window.removeEventListener("smartattend:role-permissions", listener);
  }
  return onSnapshot(
    doc(db, ROLE_PERMISSIONS_DOC.collection, ROLE_PERMISSIONS_DOC.id),
    (snap) => {
      const map = snap.exists() ? normalizeRoleMap((snap.data() as Partial<RolePermissionsDoc>).roles) : null;
      writeLocal(map);
      onChange(map);
    },
    (err) => {
      // Offline or not allowed: keep using the last copy this browser saw.
      onChange(readLocal());
      onError?.(err);
    }
  );
}

/** Validate before saving: only known roles and known permission keys. */
export function validateRoleMap(map: RolePermissionMap): string | null {
  for (const role of Object.keys(map)) {
    if (!(CONFIGURABLE_ROLES as string[]).includes(role)) return `Unknown role "${role}".`;
  }
  for (const role of CONFIGURABLE_ROLES) {
    const list = map[role];
    if (!Array.isArray(list)) return `Missing permission list for ${role}.`;
    const bad = list.find((p) => !(ALL_PERMISSIONS as string[]).includes(p));
    if (bad) return `Unknown permission "${bad}".`;
  }
  return null;
}

export async function saveRolePermissions(map: RolePermissionMap, updatedBy: string): Promise<void> {
  const clean = normalizeRoleMap(map);
  const problem = validateRoleMap(clean);
  if (problem) throw new Error(problem);

  const data: RolePermissionsDoc = {
    roles: clean,
    updatedAt: new Date().toISOString(),
    updatedBy: updatedBy || "Admin",
    version: 1,
  };

  if (isDemoMode) {
    writeLocal(clean);
    window.dispatchEvent(new Event("smartattend:role-permissions"));
    return;
  }

  try {
    await setDoc(doc(db, ROLE_PERMISSIONS_DOC.collection, ROLE_PERMISSIONS_DOC.id), data);
  } catch (err: any) {
    throw new Error(
      err?.code === "permission-denied"
        ? "Permission denied — only an active Admin can change role permissions."
        : `Could not save permissions: ${err?.message || "unknown error"}. Check the internet connection and try again.`
    );
  }
}
