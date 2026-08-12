"use client";

import { UserProfile } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import { AdminLogoutButton } from "@/components/admin/AdminLogoutButton";

export default function AdminProfileSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Profile Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Your admin account, password, and sign-in methods.
        </p>
      </div>

      {CLERK_ENABLED ? (
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
      ) : (
        <div className="surface-card space-y-4 rounded-2xl p-6">
          <p className="text-sm text-[var(--muted)]">
            Clerk is not enabled, so account profile is managed by your local
            admin login. You can still log out from here.
          </p>
          <AdminLogoutButton className="btn btn-danger !rounded-xl" />
        </div>
      )}
    </div>
  );
}
