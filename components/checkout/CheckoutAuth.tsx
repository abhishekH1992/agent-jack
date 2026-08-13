"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@heroui/react";
import { SignInButton, useUser } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";

function Fields({
  guestName,
  guestEmail,
  setGuestName,
  setGuestEmail,
}: {
  guestName: string;
  guestEmail: string;
  setGuestName: (v: string) => void;
  setGuestEmail: (v: string) => void;
}) {
  return (
    <div className="space-y-3">
      <input
        className="input"
        placeholder="Name"
        autoComplete="name"
        value={guestName}
        onChange={(e) => setGuestName(e.target.value)}
      />
      <input
        className="input"
        placeholder="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={guestEmail}
        onChange={(e) => setGuestEmail(e.target.value)}
      />
    </div>
  );
}

export function CheckoutSignInButton({ className }: { className?: string }) {
  if (!CLERK_ENABLED) {
    return (
      <Link
        href="/sign-in?redirect_url=/checkout"
        className={
          className ||
          "btn btn-primary mt-3 inline-flex min-h-11 w-full !rounded-xl"
        }
      >
        Sign in
      </Link>
    );
  }

  return (
    <SignInButton mode="modal">
      <Button
        className={
          className ||
          "mt-3 min-h-11 w-full bg-[var(--brand)] font-semibold text-white"
        }
      >
        Sign in to earn rewards
      </Button>
    </SignInButton>
  );
}

function ClerkCheckoutFields(props: {
  guestName: string;
  guestEmail: string;
  setGuestName: (v: string) => void;
  setGuestEmail: (v: string) => void;
}) {
  const { isSignedIn, user } = useUser();
  const { setGuestName, setGuestEmail } = props;

  useEffect(() => {
    if (user) {
      setGuestName(user.fullName || "");
      setGuestEmail(user.primaryEmailAddress?.emailAddress || "");
    }
  }, [user, setGuestName, setGuestEmail]);

  return (
    <>
      <h2 className="mb-2 font-bold">Your details</h2>
      {!isSignedIn ? (
        <div className="mb-4 rounded-2xl border border-[var(--brand)]/30 bg-[var(--brand-soft)] p-4">
          <p className="font-bold">Earn rewards on this order</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Sign in with Google, Apple, or email to collect points and stamps.
            You can still check out as a guest — you just won’t earn rewards.
          </p>
          <CheckoutSignInButton />
        </div>
      ) : (
        <p className="mb-3 text-sm text-[var(--muted)]">
          Signed in — points and stamps apply to this order.
        </p>
      )}
      <Fields {...props} />
    </>
  );
}

function GuestOnlyFields(props: {
  guestName: string;
  guestEmail: string;
  setGuestName: (v: string) => void;
  setGuestEmail: (v: string) => void;
}) {
  return (
    <>
      <h2 className="mb-3 font-bold">Your details</h2>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Guest checkout — no account required.
      </p>
      <Fields {...props} />
    </>
  );
}

export function CheckoutAuth(props: {
  guestName: string;
  guestEmail: string;
  setGuestName: (v: string) => void;
  setGuestEmail: (v: string) => void;
}) {
  if (!CLERK_ENABLED) return <GuestOnlyFields {...props} />;
  return <ClerkCheckoutFields {...props} />;
}
