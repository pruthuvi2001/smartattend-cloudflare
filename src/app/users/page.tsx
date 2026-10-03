"use client";

import React, { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { useAuth } from "@/lib/auth/AuthContext";
import { getAllUsers, createStaffAccount, createOrUpdateUserProfile, updateUserRoleAndStatus, deleteUserProfile } from "@/lib/firebase/auth";
import { UserProfile, UserRole } from "@/types/user";
import { ROLE_PERMISSIONS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { ShieldCheck, UserPlus, UserX, UserCheck, ShieldAlert, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("STAFF");
  const [saving, setSaving] = useState(false);
  const toast = useToast();

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getAllUsers();
      if (list.length === 0) {
        const defaults: UserProfile[] = [
          {
            userId: "admin-master-001",
            email: "admin@smartattend.edu",
            displayName: "Administrator",
            role: "ADMIN",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
          {
            userId: "staff-demo-002",
            email: "staff@smartattend.edu",
            displayName: "Staff Member",
            role: "STAFF",
            status: "ACTIVE",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ];
        // Persist defaults so they appear across reloads
        for (const u of defaults) {
          await createOrUpdateUserProfile(u.userId, u.email, u.displayName, u.role);
        }
        setUsers(defaults);
      } else {
        setUsers(list);
      }
    } catch (err) {
      console.error("Users load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !password) return;
    setSaving(true);
    try {
      const createdUser = await createStaffAccount(email.trim(), password, displayName.trim(), role);
      toast.success("User Created", `Registered ${displayName} as ${role}`);
      setAddModalOpen(false);
      setEmail("");
      setDisplayName("");
      setPassword("");
      // Instantly update state with created user
      setUsers((prev) => {
        const filtered = prev.filter((u) => u.userId !== createdUser.userId && u.email !== createdUser.email);
        return [createdUser, ...filtered];
      });
      await loadUsers();
    } catch (err: any) {
      toast.error("Error creating user", err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const nextStatus = user.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      await updateUserRoleAndStatus(user.userId, user.role, nextStatus);
      toast.info("User Status Updated", `${user.displayName} is now ${nextStatus}`);
      await loadUsers();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleChangeRole = async (user: UserProfile, newRole: UserRole) => {
    try {
      await updateUserRoleAndStatus(user.userId, newRole, user.status);
      toast.success("Role Changed", `${user.displayName} is now assigned as ${newRole}`);
      await loadUsers();
    } catch (err: any) {
      toast.error("Error", err.message);
    }
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (!confirm(`Are you sure you want to delete staff account '${user.displayName}' (${user.email})? This action cannot be undone.`)) {
      return;
    }
    try {
      await deleteUserProfile(user.userId);
      toast.info("User Account Deleted", `Removed ${user.displayName} from staff list.`);
      setUsers((prev) => prev.filter((u) => u.userId !== user.userId && u.email !== user.email));
      await loadUsers();
    } catch (err: any) {
      toast.error("Error deleting user", err.message);
    }
  };

  return (
    <ProtectedRoute requiredRole="ADMIN">
      <AppLayout>
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                User Management
              </h1>
              <p className="text-xs text-slate-500">
                Manage staff accounts, assign administrative roles, and configure system permissions.
              </p>
            </div>

            <Button
              variant="primary"
              size="sm"
              onClick={() => setAddModalOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Add Staff Member
            </Button>
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
                  {users.map((u) => (
                    <tr key={u.userId} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-semibold text-slate-900">
                        {u.displayName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-xs">
                        {u.email}
                      </td>
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className="bg-slate-100 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 px-2 py-1 focus:outline-none"
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="STAFF">STAFF</option>
                          <option value="TEACHER">TEACHER</option>
                          <option value="PRINCIPAL">PRINCIPAL</option>
                          <option value="VIEWER">VIEWER</option>
                        </select>
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant={u.status === "ACTIVE" ? "success" : "danger"}
                          size="sm"
                          dot
                        >
                          {u.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(u)}
                            className={u.status === "ACTIVE" ? "text-amber-600 hover:bg-amber-50" : "text-emerald-600 hover:bg-emerald-50"}
                          >
                            {u.status === "ACTIVE" ? "Deactivate" : "Activate"}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteUser(u)}
                            className="text-rose-600 hover:bg-rose-50 p-1.5"
                            title="Delete User Account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Add User Modal */}
          <Modal
            isOpen={addModalOpen}
            onClose={() => setAddModalOpen(false)}
            title="Create Staff Account"
            description="Add an authorized teacher or staff member to the system."
          >
            <form onSubmit={handleCreateUser} className="space-y-4">
              <Input
                label="Display Name"
                placeholder="e.g. Sarah Perera"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
              />

              <Input
                label="Email Address"
                type="email"
                placeholder="staff@smartattend.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

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
                options={[
                  { label: "STAFF (QR Scanning & Reports)", value: "STAFF" },
                  { label: "ADMIN (Full Access & Settings)", value: "ADMIN" },
                  { label: "TEACHER (Scan Only)", value: "TEACHER" },
                  { label: "PRINCIPAL (Reports & Settings)", value: "PRINCIPAL" },
                ]}
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