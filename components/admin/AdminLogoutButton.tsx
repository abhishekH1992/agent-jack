"use client";

import { CLERK_ENABLED } from "@/lib/config";

const LOGOUT_URL = "/sign-in";

async function logout() {
  try {
    // Prefer Clerk's loaded client when present (clears session cookies).
    const clerk = (
      window as Window & {
        Clerk?: { signOut?: (opts?: { redirectUrl?: string }) => Promise<void> };
      }
    ).Clerk;

    if (CLERK_ENABLED && clerk?.signOut) {
      await Promise.race([
        clerk.signOut({ redirectUrl: LOGOUT_URL }),
        new Promise<void>((resolve) => setTimeout(resolve, 1200)),
      ]);
    }
  } catch {
    // ignore — we always navigate below
  }

  window.location.assign(LOGOUT_URL);
}

export function AdminLogoutButton({ className }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => void logout()}>
      Log out
    </button>
  );
}
