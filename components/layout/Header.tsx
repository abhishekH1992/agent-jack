"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { AuthControls } from "@/components/layout/AuthControls";
import { useCart } from "@/components/cart/CartProvider";
import { getTableId } from "@/lib/cart";
import { useEffect, useState } from "react";

export function Header({ siteName = "Agent Jack" }: { siteName?: string }) {
  const { itemCount } = useCart();
  const [tableLabel, setTableLabel] = useState<string | null>(null);

  useEffect(() => {
    setTableLabel(getTableId() ? "Table linked" : null);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[rgba(255,247,237,0.92)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="h-1 w-full bg-[linear-gradient(90deg,var(--brand),var(--color-secondary),var(--cta))]" />
      <div className="page-shell flex min-h-14 items-center justify-between gap-2 py-2.5 sm:min-h-16 sm:py-3">
        <Link href="/" className="min-w-0 cursor-pointer">
          <div className="font-display truncate text-lg font-bold tracking-tight text-[var(--ink)] sm:text-2xl">
            {siteName}
          </div>
          <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Scan · Bid · Feast
          </div>
        </Link>

        <nav className="flex items-center gap-2">
          {tableLabel && (
            <span className="hidden rounded-full bg-[var(--brand-soft)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] sm:inline">
              {tableLabel}
            </span>
          )}
          <Link href="/cart" className="cursor-pointer">
            <Button
              variant="secondary"
              className="relative min-h-11 min-w-11 border-2 border-[var(--brand)] bg-white px-3 font-semibold text-[var(--brand)] sm:px-4"
            >
              Cart
              {itemCount > 0 && (
                <span className="ml-1.5 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-[var(--cta)] px-1.5 text-[10px] font-bold text-white">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
          <AuthControls />
        </nav>
      </div>
    </header>
  );
}
