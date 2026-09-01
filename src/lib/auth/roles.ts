import { UserRole } from "@/types/user";

export interface RolePermissions {
  canScan: boolean;
  canViewReports: boolean;
  canManageStudents: boolean;
  canManageUsers: boolean;
  canManageSettings: boolean;
  canExportReports: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  ADMIN: {
    canScan: true,
    canViewReports: true,
    canManageStudents: true,
    canManageUsers: true,
    canManageSettings: true,
    canExportReports: true,
  },
  STAFF: {
    canScan: true,
    canViewReports: true,
    canManageStudents: true, // can view and add students if allowed
    canManageUsers: false,
    canManageSettings: false,
    canExportReports: true,
  },
  TEACHER: {
    canScan: true,
    canViewReports: true,
    canManageStudents: false,
    canManageUsers: false,
    canManageSettings: false,
    canExportReports: false,
  },
  PRINCIPAL: {
    canScan: false,
    canViewReports: true,
    canManageStudents: false,
    canManageUsers: true,
    canManageSettings: true,
    canExportReports: true,
  },
  VIEWER: {
    canScan: false,
    canViewReports: true,
    canManageStudents: false,
    canManageUsers: false,
    canManageSettings: false,
    canExportReports: false,
  }
};

export function hasPermission(role: UserRole | undefined, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role];
  return perms ? !!perms[permission] : false;
}
