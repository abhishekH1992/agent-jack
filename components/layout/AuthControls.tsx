"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { SignedIn, SignedOut, SignInButton, UserButton } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";

export function AuthControls() {
  if (!CLERK_ENABLED) {
    return (
      <Link href="/sign-in" className="cursor-pointer">
        <Button className="min-h-11 bg-[var(--cta)] px-3 font-semibold text-white sm:px-4">
          Sign in
        </Button>
      </Link>
    );
  }

  return (
    <>
      <SignedOut>
        <SignInButton mode="modal">
          <Button className="min-h-11 cursor-pointer bg-[var(--cta)] px-3 font-semibold text-white sm:px-4">
            Sign in
          </Button>
        </SignInButton>
      </SignedOut>
      <SignedIn>
        <UserButton afterSignOutUrl="/" />
      </SignedIn>
    </>
  );
}
