"use client";

import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";

export function AuthControls() {
  if (!CLERK_ENABLED) {
    return (
      <Link
        href="/sign-in"
        className="btn btn-primary !min-h-11 !rounded-full !px-3 sm:!px-4"
      >
        Sign in
      </Link>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <button
            type="button"
            className="btn btn-primary !min-h-11 !rounded-full !px-3 sm:!px-4"
          >
            Sign in
          </button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <div className="flex min-h-11 min-w-11 items-center justify-center">
          <UserButton afterSignOutUrl="/" />
        </div>
      </SignedIn>
    </>
  );
}
