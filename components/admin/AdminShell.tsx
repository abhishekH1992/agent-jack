"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/pricing", label: "Liquor pricing" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/subcategories", label: "Subcategories" },
  { href: "/admin/menus", label: "Menu" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/rewards", label: "Rewards" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex h-dvh max-h-dvh w-[260px] flex-col border-r border-[var(--line)] bg-white transition-transform print:hidden md:sticky md:top-0 md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-5">
          <div>
            <div
              className="text-xl font-extrabold"
              style={{ fontFamily: "var(--font-display), sans-serif" }}
            >
              Agent Jack
            </div>
            <div className="text-xs uppercase tracking-[0.2em] text-[var(--muted)]">
              Admin
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            className="md:hidden"
            onPress={() => setOpen(false)}
          >
            Close
          </Button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain px-5 pb-3">
          {links.map((link) => {
            const active =
              link.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={clsx(
                  "block rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--ink)]"
                    : "text-[var(--muted)] hover:bg-[#f5f3ec] hover:text-[var(--ink)]",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto shrink-0 space-y-2 border-t border-[var(--line)] bg-white px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
          <Link
            href="/"
            className="block rounded-xl px-3 py-2.5 text-sm text-[var(--muted)] transition hover:bg-[#f5f3ec] hover:text-[var(--ink)]"
            onClick={() => setOpen(false)}
          >
            ← Storefront
          </Link>
          <AdminLogoutButton className="btn btn-danger w-full !rounded-xl" />
        </div>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-[var(--line)] bg-[rgba(250,250,247,0.92)] px-4 py-3 backdrop-blur print:hidden md:px-6">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-16 rounded-full bg-[var(--brand)] md:hidden" />
            <Button
              size="sm"
              variant="secondary"
              className="md:hidden"
              onPress={() => setOpen(true)}
            >
              Menu
            </Button>
            <div className="text-sm text-[var(--muted)]">Restaurant control</div>
          </div>
          <AdminLogoutButton className="btn btn-secondary !min-h-10 !px-3 !py-2 text-sm" />
        </div>
        {open && (
          <button
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="p-4 print:p-0 md:p-6">{children}</div>
      </div>
    </div>
  );
}
