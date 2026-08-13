export const SETTINGS_LINKS = [
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/settings/tables", label: "Tables" },
  { href: "/admin/settings/rewards", label: "Rewards" },
  { href: "/admin/settings/coupons", label: "Coupons" },
  { href: "/admin/settings/admins", label: "Admin" },
  { href: "/admin/settings/profile", label: "Profile Settings" },
] as const;

export function isSettingsPath(pathname: string) {
  return (
    pathname === "/admin/settings" || pathname.startsWith("/admin/settings/")
  );
}

export function isSettingsLinkActive(href: string, pathname: string) {
  if (href === "/admin/settings") return pathname === "/admin/settings";
  return pathname.startsWith(href);
}
