/**
 * Server-side permission check for API routes (runs on the Cloudflare Worker).
 *
 * The browser sends the signed-in user's Firebase ID token ("Authorization: Bearer …").
 * We verify it with Google, then read the user's profile and the role permissions
 * from Firestore *as that user* (so the Firestore rules apply too), and decide.
 * No service account or secret key is needed, and nothing is written.
 */
import { UserRole } from "@/types/user";
import { Permission, normalizeRoleMap, permissionsFor } from "./permissions";

const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "";
const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "";
export const serverDemoMode = !API_KEY || API_KEY === "demo-api-key";

export class ApiAuthError extends Error {
  constructor(message: string, public status: 401 | 403) {
    super(message);
  }
}

type FsValue = { stringValue?: string; arrayValue?: { values?: FsValue[] }; mapValue?: { fields?: Record<string, FsValue> } };

/** Convert a Firestore REST value to plain JS (only the shapes we use). */
export function fromFirestoreValue(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if (v.stringValue !== undefined) return v.stringValue;
  if (v.arrayValue) return (v.arrayValue.values ?? []).map(fromFirestoreValue);
  if (v.mapValue) {
    const out: Record<string, unknown> = {};
    for (const [k, val] of Object.entries(v.mapValue.fields ?? {})) out[k] = fromFirestoreValue(val);
    return out;
  }
  return undefined;
}

async function readDocAsUser(path: string, idToken: string): Promise<Record<string, FsValue> | null> {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new ApiAuthError("Could not verify your account.", 403);
  const json = (await res.json()) as { fields?: Record<string, FsValue> };
  return json.fields ?? {};
}

/**
 * Throws ApiAuthError unless the request comes from an ACTIVE user whose role has
 * ANY of the given permissions. Returns the user's id and role.
 */
export async function requirePermission(authHeader: string | null, anyOf: Permission[]): Promise<{ uid: string; role: UserRole }> {
  if (serverDemoMode) return { uid: "demo", role: "ADMIN" };

  const idToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!idToken) throw new ApiAuthError("Please sign in.", 401);

  // 1. Is the token real and current?
  const lookup = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!lookup.ok) throw new ApiAuthError("Your sign-in has expired. Please sign in again.", 401);
  const lookupJson = (await lookup.json()) as { users?: { localId: string; disabled?: boolean }[] };
  const account = lookupJson.users?.[0];
  if (!account?.localId || account.disabled) throw new ApiAuthError("Please sign in.", 401);

  // 2. Profile + role permissions (read as this user, so Firestore rules apply)
  const [profile, perms] = await Promise.all([
    readDocAsUser(`users/${account.localId}`, idToken),
    readDocAsUser("settings/rolePermissions", idToken).catch(() => null),
  ]);
  if (!profile) throw new ApiAuthError("Your account is not set up yet.", 403);
  const role = (fromFirestoreValue(profile.role) as UserRole) || ("" as UserRole);
  const status = (fromFirestoreValue(profile.status) as string) || "ACTIVE";
  if (status !== "ACTIVE") throw new ApiAuthError("Your account is not active.", 403);

  const stored = perms ? normalizeRoleMap(fromFirestoreValue(perms.roles)) : null;
  const granted = permissionsFor(role, stored);
  if (!anyOf.some((p) => granted.has(p))) throw new ApiAuthError("Your role does not have permission for this action.", 403);

  return { uid: account.localId, role };
}
