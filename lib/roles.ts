export function isStaffRole(role?: string | null) {
  return role === "admin" || role === "superadmin";
}

export function isSuperAdminRole(role?: string | null) {
  return role === "superadmin";
}

export function roleLabel(role?: string | null) {
  if (role === "superadmin") return "Superadmin";
  if (role === "admin") return "Admin";
  return "Customer";
}
