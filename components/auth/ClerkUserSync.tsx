"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { gql } from "@/lib/graphql";
import { UPSERT_ME } from "@/lib/queries";

/**
 * After Clerk sign-in/sign-up redirect, ensure a matching row exists in `users`.
 */
export function ClerkUserSync() {
  const { isLoaded, isSignedIn, user } = useUser();
  const syncedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!CLERK_ENABLED || !isLoaded || !isSignedIn || !user) return;
    if (syncedFor.current === user.id) return;

    const email = user.primaryEmailAddress?.emailAddress || undefined;
    const name =
      user.fullName ||
      [user.firstName, user.lastName].filter(Boolean).join(" ") ||
      undefined;

    syncedFor.current = user.id;
    gql(UPSERT_ME, {
      clerkId: user.id,
      email,
      name,
    }).catch((err) => {
      syncedFor.current = null;
      console.error("Failed to sync Clerk user to database", err);
    });
  }, [isLoaded, isSignedIn, user]);

  return null;
}
