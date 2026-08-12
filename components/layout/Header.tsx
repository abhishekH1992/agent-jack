"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthControls } from "@/components/layout/AuthControls";
import { SiteDrawer } from "@/components/layout/SiteDrawer";
import { useCart } from "@/components/cart/CartProvider";
import { getTableId } from "@/lib/cart";

export function Header({ siteName = "Agent Jack" }: { siteName?: string }) {
  const { itemCount } = useCart();
  const [tableLabel, setTableLabel] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setTableLabel(getTableId() ? "Table linked" : null);
  }, []);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(255,247,237,0.92)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="h-1 w-full bg-[linear-gradient(90deg,var(--brand),var(--color-secondary),var(--cta))]" />
        <div className="relative flex min-h-14 w-full items-center justify-between gap-2 px-3 py-2.5 sm:min-h-16 sm:px-4 sm:py-3 md:px-6">
          {/* Left — hamburger */}
          <button
            type="button"
            aria-label="Open menu"
            aria-expanded={menuOpen}
            className="btn btn-secondary !min-h-11 !min-w-11 !rounded-full !px-0"
            onClick={() => setMenuOpen(true)}
          >
            <span className="flex flex-col items-center justify-center gap-[5px]" aria-hidden>
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
              <span className="block h-[2px] w-[18px] rounded-full bg-current" />
            </span>
          </button>

          {/* Center — brand */}
          <Link
            href="/"
            className="absolute left-1/2 min-w-0 -translate-x-1/2 cursor-pointer text-center"
          >
            <div className="font-display truncate text-lg font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
              {siteName}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              {tableLabel || "Scan · Bid · Feast"}
            </div>
          </Link>

          {/* Right — cart + sign in */}
          <nav className="flex items-center gap-2">
            <Link
              href="/cart"
              className="btn btn-secondary relative !min-h-11 !rounded-full !px-3 sm:!px-4"
            >
              Cart
              {itemCount > 0 ? (
                <span className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cta)] px-1.5 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              ) : null}
            </Link>
            <AuthControls />
          </nav>
        </div>
      </header>

      <SiteDrawer
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        siteName={siteName}
      />
    </>
  );
}
