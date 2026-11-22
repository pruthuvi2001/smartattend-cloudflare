"use client";

import React from "react";
import { useAuth } from "@/lib/auth/AuthContext";
import { Permission } from "@/lib/auth/permissions";

/**
 * Shows its children only when the signed-in user has ANY of the given permissions.
 * Used to hide buttons and links. (The database rules block the action itself too.)
 */
export const IfCan: React.FC<{ any: Permission | Permission[]; children: React.ReactNode; fallback?: React.ReactNode }> = ({
  any,
  children,
  fallback = null,
}) => {
  const { canAny } = useAuth();
  return <>{canAny(Array.isArray(any) ? any : [any]) ? children : fallback}</>;
};
