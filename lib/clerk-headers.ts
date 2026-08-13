"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useCallback } from "react";
import { gql } from "@/lib/graphql";

/** Headers the API uses to resolve `ctx.user` from Clerk. */
export function clerkAuthHeaders(input: {
  userId?: string | null;
  email?: string | null;
  name?: string | null;
}): Record<string, string> {
  if (!input.userId) return {};
  const headers: Record<string, string> = {
    "x-clerk-user-id": input.userId,
  };
  if (input.email) headers["x-clerk-email"] = input.email;
  if (input.name) headers["x-clerk-name"] = input.name;
  return headers;
}

/**
 * GraphQL helper that attaches the signed-in Clerk user.
 * Only call from components under ClerkProvider (CLERK_ENABLED).
 */
export function useClerkGql() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();

  return useCallback(
    <T,>(query: string, variables?: Record<string, unknown>) => {
      const headers =
        isSignedIn && userId
          ? clerkAuthHeaders({
              userId,
              email: user?.primaryEmailAddress?.emailAddress,
              name: user?.fullName,
            })
          : {};
      return gql<T>(query, variables, headers);
    },
    [isSignedIn, userId, user],
  );
}
