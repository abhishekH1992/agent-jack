"use client";

import { useEffect } from "react";
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
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-bold">Your details</h2>
        {!isSignedIn && (
          <SignInButton mode="modal">
            <Button className="min-h-11 bg-[var(--cta)] font-semibold text-white">
              Sign in
            </Button>
          </SignInButton>
        )}
      </div>
      <p className="mb-3 text-sm text-[var(--muted)]">
        Continue as guest or sign in with Google, Facebook, or Apple.
      </p>
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
