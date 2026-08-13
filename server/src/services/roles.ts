import { UserRole } from "@prisma/client";

export const STAFF_ROLES: UserRole[] = [UserRole.admin, UserRole.superadmin];

export function isStaffRole(role?: string | null): boolean {
  return role === UserRole.admin || role === UserRole.superadmin;
}

export function isSuperAdminRole(role?: string | null): boolean {
  return role === UserRole.superadmin;
}

export function resolvePersistedRole(input: {
  existingRole?: string | null;
  roleHeader?: string | null;
  email?: string | null;
}): UserRole {
  if (input.existingRole === UserRole.superadmin) return UserRole.superadmin;
  if (input.existingRole === UserRole.admin) return UserRole.admin;
  if (input.roleHeader === UserRole.superadmin) return UserRole.superadmin;
  if (input.roleHeader === UserRole.admin) return UserRole.admin;
  if (input.email?.trim().toLowerCase() === "admin@example.com") {
    return UserRole.superadmin;
  }
  return UserRole.customer;
}
