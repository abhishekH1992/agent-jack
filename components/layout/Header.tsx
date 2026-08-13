"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { SiteDrawer } from "@/components/layout/SiteDrawer";
import { getTableId } from "@/lib/cart";

export function Header({
  siteName = "Agent Jack",
  siteLogo = null,
}: {
  siteName?: string;
  siteLogo?: string | null;
}) {
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const hasLogo = Boolean(siteLogo?.trim());

  useEffect(() => {
    setTableLabel(getTableId() ? "Table linked" : null);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(255,247,237,0.92)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--brand),var(--color-secondary),var(--cta))]" />
        <div className="relative flex min-h-14 w-full items-center justify-between gap-2 px-3 py-2.5 sm:min-h-16 sm:px-4 sm:py-3 md:px-6">
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="btn btn-secondary !min-h-11 !min-w-11 !rounded-full !px-0"
            onClick={() => setMenuOpen(true)}
          >
            <span
              className="flex flex-col items-center justify-center gap-[5px]"
              aria-hidden
            >
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
            </span>
          </button>

          <Link
            href="/"
            className="absolute left-1/2 min-w-0 max-w-[70%] -translate-x-1/2 cursor-pointer text-center"
            aria-label={siteName}
          >
            {hasLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={siteLogo!}
                alt={siteName}
                className="mx-auto h-9 w-auto max-w-full object-contain sm:h-11"
              />
            ) : (
              <div className="font-display truncate text-lg font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
                {siteName}
              </div>
            )}
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {tableLabel || "Scan · Bid · Feast"}
            </div>
          </Link>

          <div className="min-h-11 min-w-11" aria-hidden />
        </div>
      </header>

      <SiteDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        siteName={siteName}
        siteLogo={siteLogo}
      />
    </>
  );
}
