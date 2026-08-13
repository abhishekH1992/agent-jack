"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, SignOutButton, UserProfile, useUser } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";

function ProfileHome() {
  const { user } = useUser();
  const name =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.primaryEmailAddress?.emailAddress ||
    "Your profile";

  return (
    <div className="page-shell space-y-5 py-8 pb-32">
      <div>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Profile Settings
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">{name}</p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/orders" className="btn btn-secondary !rounded-xl">
          Your orders
        </Link>
        <Link href="/rewards" className="btn btn-secondary !rounded-xl">
          Rewards
        </Link>
        <SignOutButton redirectUrl="/">
          <button type="button" className="btn btn-danger !rounded-xl">
            Sign out
          </button>
        </SignOutButton>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-white">
        <UserProfile
          routing="hash"
          appearance={{
            elements: {
              rootBox: "w-full",
              cardBox: "w-full shadow-none",
              card: "w-full shadow-none",
            },
          }}
        />
      </div>
    </div>
  );
}

export default function ProfilePage() {
  if (!CLERK_ENABLED) {
    return (
      <div className="page-shell space-y-4 py-8 pb-32">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          Profile Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Sign-in is not configured, so profile settings are unavailable.
        </p>
        <Link href="/menu" className="btn btn-primary !rounded-xl">
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="page-shell space-y-4 py-8 pb-32">
          <h1 className="font-display text-3xl font-bold sm:text-4xl">
            Profile Settings
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sign in to manage your name, email, and sign-in methods — and to
            earn rewards on orders.
          </p>
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary !rounded-xl">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <ProfileHome />
      </SignedIn>
    </>
  );
}
