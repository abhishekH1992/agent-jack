"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import clsx from "clsx";
import { SignInButton, useAuth, useUser } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { useCart } from "@/components/cart/CartProvider";

function IconMenu({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M8 3v7.5a2 2 0 1 0 4 0V3M10 3v18M16 3v18M16 3c2.4 2.2 2.4 6.2 0 8.5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconCart({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M6 8h12l-1 11H7L6 8Z"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
      <path
        d="M9 8V7a3 3 0 0 1 6 0v1"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconRewards({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 3.5l2.2 4.5 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 8.7l5-.7L12 3.5Z"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconProfile({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="8" r="3.25" stroke="currentColor" strokeWidth="2.25" />
      <path
        d="M5.5 19c.8-3.2 3.2-5 6.5-5s5.7 1.8 6.5 5"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NavItem({
  href,
  label,
  active,
  badge,
  icon,
}: {
  href: string;
  label: string;
  active: boolean;
  badge?: number;
  icon: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 pt-1 transition-colors duration-200",
        active ? "text-[var(--brand)]" : "text-[var(--muted)]",
      )}
    >
      <span className="relative inline-flex h-6 w-6 items-center justify-center">
        {icon}
        {badge && badge > 0 ? (
          <span className="absolute -right-2.5 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-[var(--brand)] px-1 text-[9px] font-bold leading-none text-white">
            {badge > 99 ? "99+" : badge}
          </span>
        ) : null}
      </span>
      <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.08em]">
        {label}
      </span>
    </Link>
  );
}

function ProfileTab() {
  const pathname = usePathname();
  const { user } = useUser();
  const active = pathname === "/profile" || pathname.startsWith("/profile/");
  const firstName = user?.firstName?.trim();

  return (
    <NavItem
      href="/profile"
      label={firstName || "Profile"}
      active={active}
      icon={<IconProfile />}
    />
  );
}

function SignInTab() {
  const pathname = usePathname();
  const active = pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  const className = clsx(
    "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 px-1 pt-1 transition-colors duration-200",
    active ? "text-[var(--brand)]" : "text-[var(--muted)]",
  );
  const inner = (
    <>
      <span className="inline-flex h-6 w-6 items-center justify-center">
        <IconProfile />
      </span>
      <span className="max-w-full truncate text-[10px] font-bold uppercase tracking-[0.08em]">
        Sign in
      </span>
    </>
  );

  if (!CLERK_ENABLED) {
    return (
      <Link href="/sign-in" className={className} aria-current={active ? "page" : undefined}>
        {inner}
      </Link>
    );
  }

  return (
    <SignInButton mode="modal">
      <button type="button" className={className}>
        {inner}
      </button>
    </SignInButton>
  );
}

function ClerkAccountTab() {
  const { isLoaded, isSignedIn } = useAuth();
  if (!isLoaded || !isSignedIn) return <SignInTab />;
  return <ProfileTab />;
}

export function BottomNav() {
  const pathname = usePathname();
  const { itemCount } = useCart();

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--toast-bottom",
      "calc(5rem + env(safe-area-inset-bottom, 0px))",
    );
    return () => {
      document.documentElement.style.removeProperty("--toast-bottom");
    };
  }, []);

  const menuActive =
    pathname === "/" ||
    pathname === "/menu" ||
    pathname.startsWith("/menu/") ||
    pathname.startsWith("/category/") ||
    pathname.startsWith("/liquor");
  const cartActive =
    pathname === "/cart" ||
    pathname.startsWith("/cart/") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/");
  const rewardsActive = pathname === "/rewards" || pathname.startsWith("/rewards/");

  return (
    <nav
      className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 pt-1 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur print:hidden"
      aria-label="Primary"
    >
      <div className="mx-auto grid max-w-lg grid-cols-4 px-1">
        <NavItem
          href="/menu"
          label="Menu"
          active={menuActive}
          icon={<IconMenu />}
        />
        <NavItem
          href="/cart"
          label="Cart"
          active={cartActive}
          badge={itemCount}
          icon={<IconCart />}
        />
        <NavItem
          href="/rewards"
          label="Rewards"
          active={rewardsActive}
          icon={<IconRewards />}
        />
        {CLERK_ENABLED ? <ClerkAccountTab /> : <SignInTab />}
      </div>
    </nav>
  );
}
