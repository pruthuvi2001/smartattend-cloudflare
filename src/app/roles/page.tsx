"use client";

/**
 * Role & Permission Management (ADMIN only).
 * Pick a role, switch features on/off, then Save. Changes reach every signed-in
 * user within seconds and are enforced by the database rules as well.
 * Saved in Firestore: settings/rolePermissions (one settings document).
 */
import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  ADMIN_ONLY_ABILITIES,
  ALL_PERMISSIONS,
  CONFIGURABLE_ROLES,
  DEFAULT_ROLE_PERMISSIONS,
  PERMISSION_CATEGORIES,
  Permission,
  ROLE_LABELS,
  RolePermissionMap,
  diffRoleMaps,
  permissionLabel,
} from "@/lib/auth/permissions";
import { saveRolePermissions } from "@/lib/auth/rolePermissionsService";
import { getAllUsers } from "@/lib/firebase/auth";
import { UserProfile, UserRole } from "@/types/user";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { useToast } from "@/components/ui/Toast";
import { clsx } from "clsx";
import { AlertTriangle, CheckCircle2, KeyRound, Lock, RotateCcw, Save, ShieldCheck, Users } from "lucide-react";

type EditableRole = Exclude<UserRole, "ADMIN">;

const clone = (m: RolePermissionMap): RolePermissionMap =>
  Object.fromEntries(CONFIGURABLE_ROLES.map((r) => [r, [...m[r]]])) as RolePermissionMap;

export default function RolesPage() {
  const { rolePermissions, userProfile } = useAuth();
  const toast = useToast();
  const saved = useMemo(() => rolePermissions ?? DEFAULT_ROLE_PERMISSIONS, [rolePermissions]);
  const [draft, setDraft] = useState<RolePermissionMap>(() => clone(saved));
  const [selected, setSelected] = useState<UserRole>("STAFF");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<UserProfile[]>([]);

  const changes = useMemo(() => diffRoleMaps(saved, draft), [saved, draft]);
  const dirty = changes.length > 0;

  // Another admin saved while this page was open and we have no unsaved edits → show theirs.
  useEffect(() => {
    if (!dirty) setDraft(clone(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  useEffect(() => {
    getAllUsers()
      .then(setUsers)
      .catch(() => setUsers([]));
  }, []);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const usersInRole = (r: UserRole) => users.filter((u) => u.role === r && (u.status ?? "ACTIVE") === "ACTIVE").length;
  const isAdminSelected = selected === "ADMIN";
  const editable = selected as EditableRole;
  const has = (p: Permission) => isAdminSelected || draft[editable].includes(p);
  const changedForRole = (r: UserRole) => r !== "ADMIN" && changes.some((c) => c.role === r);

  const setPerms = (perms: Permission[], on: boolean) => {
    if (isAdminSelected) return;
    setDraft((d) => {
      const next = clone(d);
      const set = new Set(next[editable]);
      perms.forEach((p) => (on ? set.add(p) : set.delete(p)));
      next[editable] = ALL_PERMISSIONS.filter((p) => set.has(p));
      return next;
    });
  };

  const sensitiveGrants = changes.flatMap((c) =>
    c.granted
      .filter((p) => PERMISSION_CATEGORIES.some((cat) => cat.permissions.some((d) => d.key === p && d.sensitive)))
      .map((p) => `${ROLE_LABELS[c.role].label}: ${permissionLabel(p)}`)
  );

  const doSave = async () => {
    setSaving(true);
    try {
      await saveRolePermissions(draft, userProfile?.displayName || userProfile?.email || "Admin");
      setConfirmOpen(false);
      toast.success("Permissions saved", "Changes apply to signed-in users within a few seconds.");
    } catch (err: any) {
      toast.error("Could not save", err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AppLayout>
        <div className="space-y-6 pb-24">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
                  <KeyRound className="w-4 h-4" />
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Roles &amp; Permissions</h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Choose what each role can see and do. Menus, pages, buttons and the database all follow these settings.
              </p>
            </div>
            {!rolePermissions && (
              <Badge variant="warning" size="sm">
                Using built-in defaults (not saved yet)
              </Badge>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6 items-start">
            {/* Role list */}
            <div className="flex lg:flex-col gap-2 overflow-x-auto pb-1 lg:pb-0 -mx-1 px-1">
              {(["ADMIN", ...CONFIGURABLE_ROLES] as UserRole[]).map((r) => {
                const count = r === "ADMIN" ? ALL_PERMISSIONS.length : draft[r as EditableRole].length;
                const active = r === selected;
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelected(r)}
                    aria-pressed={active}
                    className={clsx(
                      "shrink-0 lg:w-full text-left rounded-xl border px-4 py-3 transition-colors min-w-[180px]",
                      active ? "bg-indigo-600 border-indigo-500 text-white shadow-sm" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-sm flex items-center gap-1.5">
                        {r === "ADMIN" && <Lock className="w-3.5 h-3.5" />}
                        {ROLE_LABELS[r].label}
                      </span>
                      {changedForRole(r) && <span className="w-2 h-2 rounded-full bg-amber-400" title="Unsaved changes" />}
                    </div>
                    <div className={clsx("text-[11px] mt-0.5 flex items-center gap-2", active ? "text-indigo-100" : "text-slate-500")}>
                      <span>
                        {count} / {ALL_PERMISSIONS.length} permissions
                      </span>
                      <span className="inline-flex items-center gap-0.5">
                        <Users className="w-3 h-3" />
                        {usersInRole(r)}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Permissions of the selected role */}
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h2 className="text-base font-black text-slate-900">{ROLE_LABELS[selected].label}</h2>
                  <p className="text-xs text-slate-500">{ROLE_LABELS[selected].description}</p>
                </div>
                {isAdminSelected ? (
                  <Badge variant="purple" size="sm">
                    <ShieldCheck className="w-3.5 h-3.5 mr-1 inline" /> Always full access
                  </Badge>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPerms(ALL_PERMISSIONS, true)}>
                      Select all
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setPerms(ALL_PERMISSIONS, false)}>
                      Deselect all
                    </Button>
                  </div>
                )}
              </div>

              {PERMISSION_CATEGORIES.map((cat) => {
                const keys = cat.permissions.map((p) => p.key);
                const onCount = keys.filter(has).length;
                return (
                  <section key={cat.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" aria-labelledby={`cat-${cat.id}`}>
                    <div className="flex items-center justify-between gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200">
                      <h3 id={`cat-${cat.id}`} className="text-xs font-bold uppercase tracking-wider text-slate-600">
                        {cat.label}
                        <span className="ml-2 font-semibold normal-case tracking-normal text-slate-400">
                          {onCount}/{keys.length}
                        </span>
                      </h3>
                      {!isAdminSelected && keys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setPerms(keys, onCount !== keys.length)}
                          className="text-[11px] font-semibold text-indigo-600 hover:underline"
                        >
                          {onCount === keys.length ? "Turn all off" : "Turn all on"}
                        </button>
                      )}
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {cat.permissions.map((p) => {
                        const on = has(p.key);
                        const wasOn = isAdminSelected || saved[editable]?.includes(p.key);
                        return (
                          <li key={p.key} className="flex items-center justify-between gap-4 px-4 py-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-semibold text-slate-900">{p.label}</span>
                                {p.sensitive && (
                                  <Badge variant="warning" size="sm">
                                    Sensitive
                                  </Badge>
                                )}
                                {!isAdminSelected && on !== wasOn && (
                                  <span className="text-[10px] font-bold uppercase text-amber-600">Changed</span>
                                )}
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">{p.description}</p>
                            </div>
                            <Toggle
                              checked={on}
                              disabled={isAdminSelected}
                              label={`${p.label} for ${ROLE_LABELS[selected].label}`}
                              onChange={(v) => setPerms([p.key], v)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </section>
                );
              })}

              {/* Admin-only abilities */}
              <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Admin only (cannot be given to other roles)</h3>
                </div>
                <ul className="divide-y divide-slate-100">
                  {ADMIN_ONLY_ABILITIES.map((a) => (
                    <li key={a.label} className="flex items-center justify-between gap-4 px-4 py-3">
                      <div>
                        <span className="text-sm font-semibold text-slate-900">{a.label}</span>
                        <p className="text-xs text-slate-500 mt-0.5">{a.description}</p>
                      </div>
                      <Toggle checked={isAdminSelected} disabled label={`${a.label} for ${ROLE_LABELS[selected].label}`} onChange={() => {}} />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          </div>

          {/* Save bar */}
          <div
            className={clsx(
              "fixed bottom-0 left-0 right-0 lg:left-64 z-30 border-t border-slate-200 bg-white/95 backdrop-blur px-4 py-3 transition-transform",
              dirty ? "translate-y-0" : "translate-y-full"
            )}
            aria-hidden={!dirty}
          >
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
              <p className="text-xs text-slate-600">
                <strong>{changes.reduce((n, c) => n + c.granted.length + c.revoked.length, 0)}</strong> unsaved change(s) in{" "}
                {changes.map((c) => ROLE_LABELS[c.role].label).join(", ")}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setDraft(clone(saved))} leftIcon={<RotateCcw className="w-3.5 h-3.5" />} tabIndex={dirty ? 0 : -1}>
                  Reset changes
                </Button>
                <Button variant="primary" size="sm" onClick={() => setConfirmOpen(true)} leftIcon={<Save className="w-3.5 h-3.5" />} tabIndex={dirty ? 0 : -1}>
                  Save changes
                </Button>
              </div>
            </div>
          </div>

          {/* Confirmation */}
          <Modal isOpen={confirmOpen} onClose={() => !saving && setConfirmOpen(false)} title="Save permission changes?" description="Users with these roles get the new access within a few seconds." maxWidth="lg">
            <div className="space-y-4">
              <div className="max-h-72 overflow-y-auto space-y-3">
                {changes.map((c) => (
                  <div key={c.role} className="rounded-lg border border-slate-200 p-3">
                    <p className="text-sm font-bold text-slate-900">
                      {ROLE_LABELS[c.role].label} <span className="font-normal text-slate-500">({usersInRole(c.role)} active user(s))</span>
                    </p>
                    {c.granted.length > 0 && (
                      <p className="text-xs text-emerald-700 mt-1">
                        <CheckCircle2 className="w-3.5 h-3.5 inline mr-1" />
                        Allow: {c.granted.map(permissionLabel).join(", ")}
                      </p>
                    )}
                    {c.revoked.length > 0 && (
                      <p className="text-xs text-rose-700 mt-1">
                        <Lock className="w-3.5 h-3.5 inline mr-1" />
                        Remove: {c.revoked.map(permissionLabel).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
              {sensitiveGrants.length > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 flex gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    You are giving sensitive access (money or deleting data): {sensitiveGrants.join("; ")}.
                  </span>
                </div>
              )}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={doSave} isLoading={saving} leftIcon={<Save className="w-4 h-4" />}>
                  Save changes
                </Button>
              </div>
            </div>
          </Modal>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}

/** Accessible on/off switch. */
const Toggle: React.FC<{ checked: boolean; disabled?: boolean; label: string; onChange: (v: boolean) => void }> = ({ checked, disabled, label, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    disabled={disabled}
    onClick={() => onChange(!checked)}
    className={clsx(
      "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400",
      checked ? "bg-emerald-500" : "bg-slate-300",
      disabled ? "opacity-60 cursor-not-allowed" : "cursor-pointer"
    )}
  >
    <span className={clsx("inline-block h-5 w-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-5" : "translate-x-0.5")} />
    <span className="sr-only">{checked ? "On" : "Off"}</span>
  </button>
);
