"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  SETTINGS_LINKS,
  isSettingsLinkActive,
} from "@/components/admin/settings-nav";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="space-y-6">
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 min-[900px]:hidden">
        {SETTINGS_LINKS.map((item) => {
          const active = isSettingsLinkActive(item.href, pathname);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                active
                  ? "bg-[var(--ink)] text-white"
                  : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
