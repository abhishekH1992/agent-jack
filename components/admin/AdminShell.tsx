"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button } from "@heroui/react";
import clsx from "clsx";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/belts", label: "Belts" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/subcategories", label: "Subcategories" },
  { href: "/admin/menus", label: "Menus" },
  { href: "/admin/tables", label: "Tables & QR" },
  { href: "/admin/pricing", label: "Liquor pricing" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/settings", label: "Settings" },
];

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="admin-shell">
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-[260px] border-r border-[var(--line)] bg-white p-5 transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="mb-8 flex items-center justify-between">
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
        <nav className="space-y-1">
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
        <Link
          href="/"
          className="mt-8 block text-sm text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Back to storefront
        </Link>
      </aside>

      <div className="min-w-0">
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-[var(--line)] bg-[rgba(250,250,247,0.92)] px-4 py-3 backdrop-blur md:px-6">
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
        {open && (
          <button
            className="fixed inset-0 z-30 bg-black/40 md:hidden"
            aria-label="Close menu overlay"
            onClick={() => setOpen(false)}
          />
        )}
        <div className="p-4 md:p-6">{children}</div>
      </div>
    </div>
  );
}
