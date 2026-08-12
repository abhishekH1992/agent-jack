import { SignUp } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import Link from "next/link";

export default function SignUpPage() {
  if (!CLERK_ENABLED) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="surface-card max-w-md rounded-2xl p-8 text-center">
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Sign up
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Configure Clerk Hobby social connections (Google, Facebook, Apple)
            to enable accounts.
          </p>
          <Link href="/" className="btn btn-primary mt-6 inline-flex">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignUp />
    </div>
  );
}
