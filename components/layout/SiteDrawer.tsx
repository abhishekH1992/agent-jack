"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import clsx from "clsx";
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignOutButton,
} from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { useCart } from "@/components/cart/CartProvider";

const links = [
  { href: "/menu", label: "Menu" },
  { href: "/liquor", label: "Liquor menu" },
  { href: "/cart", label: "Cart", showCount: true },
  { href: "/orders", label: "Order" },
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
];

function DrawerAuth() {
  if (!CLERK_ENABLED) {
    return (
      <Link href="/sign-in" className="btn btn-primary w-full !rounded-xl">
        Sign in
      </Link>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button type="button" className="btn btn-primary w-full !rounded-xl">
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <SignOutButton redirectUrl="/">
          <button type="button" className="btn btn-danger w-full !rounded-xl">
            Sign out
          </button>
        </SignOutButton>
      </SignedIn>
    </>
  );
}

export function SiteDrawer({
  open,
  onClose,
  siteName,
}: {
  open: boolean;
  onClose: () => void;
  siteName: string;
}) {
  const pathname = usePathname();
  const { itemCount } = useCart();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    onClose();
    // Close on route change only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <div
      className={clsx(
        "fixed inset-0 z-[60] transition-opacity duration-300",
        open
          ? "pointer-events-auto opacity-100"
          : "pointer-events-none opacity-0",
      )}
      aria-hidden={!open}
    >
      <button
        type="button"
        aria-label="Close menu"
        className={clsx(
          "absolute inset-0 bg-black/45 transition-opacity duration-300 md:bg-black/30",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />

      <aside
        className={clsx(
          "absolute inset-y-0 left-0 flex w-full flex-col bg-[var(--page)] shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          "md:w-[360px] md:max-w-[min(360px,42vw)] lg:w-[380px]",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        role="dialog"
        aria-modal="true"
        aria-label="Site menu"
      >
        <div className="flex items-center justify-between border-b border-[var(--line)] px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
          <div>
            <div
              className="text-xl font-bold"
              style={{ fontFamily: "var(--font-display), serif" }}
            >
              {siteName}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Navigate
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary !min-h-10 !rounded-xl !px-3 !py-2 text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {links.map((link) => {
            const active =
              pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  "flex items-center justify-between rounded-xl px-4 py-3.5 text-base font-semibold transition",
                  active
                    ? "bg-[var(--brand-soft)] text-[var(--ink)]"
                    : "text-[var(--ink)] hover:bg-white",
                )}
              >
                <span>{link.label}</span>
                {link.showCount ? (
                  <span className="inline-flex min-h-6 min-w-6 items-center justify-center rounded-full bg-[var(--cta)] px-2 text-xs font-bold text-white">
                    {itemCount}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-[var(--line)] p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerAuth />
        </div>
      </aside>
    </div>
  );
}
