"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAllUsers, createStaffAccount, updateUserRoleAndStatus, deleteUserProfile } from "@/lib/firebase/auth";
import { UserProfile, UserRole } from "@/types/user";
import { ROLE_LABELS } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { UserPlus, Trash2, KeyRound, Lock } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

const ALL_ROLES: UserRole[] = ["ADMIN", "PRINCIPAL", "TEACHER", "STAFF", "VIEWER"];

/**
 * User Management.
 * Safety rules (also enforced by firestore.rules on the server):
 *  - Nobody can change their own role or status, or delete their own account.
 *  - Only an Admin can create, change or remove Admin accounts.
 *  - The last active Admin cannot be demoted, deactivated or removed.
 */
export default function UsersPage() {
  const { user, userProfile, isAdmin } = useAuth();
  const myId = user?.uid || userProfile?.userId || "";
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const assignableRoles = ALL_ROLES.filter((r) => isAdmin || r !== "ADMIN");
  const activeAdmins = users.filter((u) => u.role === "ADMIN" && (u.status ?? "ACTIVE") === "ACTIVE");

  /** Why this account cannot be changed by the current user (null = it can). */
  const lockReason = (u: UserProfile): string | null => {
    if (u.userId === myId) return "This is your own account — another administrator must change it.";
    if (u.role === "ADMIN" && !isAdmin) return "Only an Admin can change Admin accounts.";
    return null;
  };
  const isLastActiveAdmin = (u: UserProfile) =>
    u.role === "ADMIN" && (u.status ?? "ACTIVE") === "ACTIVE" && activeAdmins.length <= 1;

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      list.sort((a, b) => ALL_ROLES.indexOf(a.role) - ALL_ROLES.indexOf(b.role) || a.displayName.localeCompare(b.displayName));
      setUsers(list);
    } catch (err) {
      console.error("Users load error:", err);
      toast.error("Could not load users", "Check the internet connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !password) return;
    if (role === "ADMIN" && !isAdmin) {
      toast.error("Not allowed", "Only an Admin can create Admin accounts.");
      return;
    }
    setSaving(true);
    try {
      const createdUser = await createStaffAccount(email.trim(), password, displayName.trim(), role);
      toast.success("User Created", `Registered ${displayName} as ${ROLE_LABELS[role].label}`);
      setAddModalOpen(false);
      setEmail("");
      setDisplayName("");
      setPassword("");
      setUsers((prev) => [createdUser, ...prev.filter((u) => u.userId !== createdUser.userId && u.email !== createdUser.email)]);
      await loadUsers();
    } catch (err: any) {
      toast.error("Error creating user", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (u: UserProfile) => {
    const nextStatus = (u.status ?? "ACTIVE") === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (nextStatus === "INACTIVE" && isLastActiveAdmin(u)) {
      toast.error("Not allowed", "This is the last active Admin. Make another user Admin first.");
      return;
    }
    if (!confirm(`${nextStatus === "INACTIVE" ? "Deactivate" : "Activate"} ${u.displayName}?${nextStatus === "INACTIVE" ? " They will lose access immediately." : ""}`)) return;
    try {
      await updateUserRoleAndStatus(u.userId, u.role, nextStatus);
      toast.info("User Status Updated", `${u.displayName} is now ${nextStatus}`);
      await loadUsers();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleChangeRole = async (u: UserProfile, newRole: UserRole) => {
    if (newRole === u.role) return;
    if (u.role === "ADMIN" && isLastActiveAdmin(u)) {
      toast.error("Not allowed", "This is the last active Admin. Make another user Admin first.");
      return;
    }
    if (!confirm(`Change ${u.displayName} from ${ROLE_LABELS[u.role]?.label ?? u.role} to ${ROLE_LABELS[newRole].label}? Their access changes immediately.`)) {
      await loadUsers(); // reset the dropdown
      return;
    }
    try {
      await updateUserRoleAndStatus(u.userId, newRole, (u.status ?? "ACTIVE") as "ACTIVE" | "INACTIVE");
      toast.success("Role Changed", `${u.displayName} is now ${ROLE_LABELS[newRole].label}`);
      await loadUsers();
    } catch (err: any) {
      toast.error("Error", err.message);
      await loadUsers();
    }
  };

  const handleDeleteUser = async (u: UserProfile) => {
    if (isLastActiveAdmin(u)) {
      toast.error("Not allowed", "This is the last active Admin. Make another user Admin first.");
      return;
    }
    if (!confirm(`Remove '${u.displayName}' (${u.email}) from SmartAttend? They will lose access. This cannot be undone.`)) return;
    try {
      await deleteUserProfile(u.userId);
      toast.info("User Removed", `Removed ${u.displayName} from the staff list.`);
      setUsers((prev) => prev.filter((x) => x.userId !== u.userId));
      await loadUsers();
    } catch (err: any) {
      toast.error("Error removing user", err.message);
    }
  };

  return (
    <ProtectedRoute permission="users_manage">
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">User Management</h1>
              <p className="text-xs text-slate-500">
                Manage staff accounts and their roles.{" "}
                {isAdmin && (
                  <>
                    What each role can do is set in{" "}
                    <Link href="/roles" className="font-semibold text-indigo-600 underline">
                      Roles &amp; Permissions
                    </Link>
                    .
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && (
                <Link href="/roles">
                  <Button variant="outline" size="sm" leftIcon={<KeyRound className="w-4 h-4" />}>
                    Roles &amp; Permissions
                  </Button>
                </Link>
              )}
              <Button variant="primary" size="sm" onClick={() => setAddModalOpen(true)} leftIcon={<UserPlus className="w-4 h-4" />}>
                Add Staff Member
              </Button>
            </div>
          </div>

          {/* User Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 border-b border-slate-200 text-xs font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="py-3.5 px-4">Name</th>
                    <th className="py-3.5 px-4">Email</th>
                    <th className="py-3.5 px-4">Role</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        Loading users…
                      </td>
                    </tr>
                  )}
                  {!loading && users.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        No users found.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => {
                    const locked = lockReason(u);
                    const status = u.status ?? "ACTIVE";
                    return (
                      <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-semibold text-slate-900">
                          <span className="inline-flex items-center gap-2">
                            {u.displayName}
                            {u.userId === myId && (
                              <Badge variant="purple" size="sm">
                                You
                              </Badge>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">{u.email}</td>
                        <td className="py-3.5 px-4">
                          {locked ? (
                            <span title={locked} className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700">
                              <Lock className="w-3.5 h-3.5 text-slate-400" />
                              {ROLE_LABELS[u.role]?.label ?? u.role}
                            </span>
                          ) : (
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                              aria-label={`Role of ${u.displayName}`}
                              className="bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 px-2 py-1 focus:outline-none"
                            >
                              {assignableRoles.map((r) => (
                                <option key={r} value={r}>
                                  {ROLE_LABELS[r].label}
                                </option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant={status === "ACTIVE" ? "success" : "danger"} size="sm" dot>
                            {status}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {locked ? (
                            <span className="text-[11px] text-slate-400" title={locked}>
                              {u.userId === myId ? "Your account" : "Admin only"}
                            </span>
                          ) : (
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(u)}
                                className={status === "ACTIVE" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}
                              >
                                {status === "ACTIVE" ? "Deactivate" : "Activate"}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(u)}
                                className="text-rose-600 hover:bg-rose-50 p-1.5"
                                title="Remove User"
                                aria-label={`Remove ${u.displayName}`}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          <Modal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            title="Create Staff Account"
            description="Add a teacher or staff member. What they can do depends on their role."
          >
            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input label="Display Name" placeholder="e.g. Sarah Perera" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              <Input label="Email Address" type="email" placeholder="staff@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <Input
                label="Temporary Password"
                type="password"
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
              <Select
                label="Assigned Role"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                options={assignableRoles.map((r) => ({ label: `${ROLE_LABELS[r].label} — ${ROLE_LABELS[r].description}`, value: r }))}
              />
              <div className="flex items-center justify-end gap-2 pt-3">
                <Button type="button" variant="outline" onClick={() => setAddModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" isLoading={saving}>
                  Create Account
                </Button>
              </div>
            </form>
          </Modal>
        </div>
      </AppLayout>
    </ProtectedRoute>
  );
}
