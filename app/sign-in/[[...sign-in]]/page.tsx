import { SignIn } from "@clerk/nextjs";
import { CLERK_ENABLED } from "@/lib/config";
import Link from "next/link";

function safeRedirect(url?: string) {
  if (!url || !url.startsWith("/") || url.startsWith("//")) return "/";
  return url;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string }>;
}) {
  const params = await searchParams;
  const redirectUrl = safeRedirect(params.redirect_url);

  if (!CLERK_ENABLED) {
    return (
      <div className="page-shell flex min-h-screen items-center justify-center">
        <div className="surface-card max-w-md rounded-2xl p-8 text-center">
          <h1
            className="text-3xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Sign in
          </h1>
          <p className="mt-3 text-sm text-[var(--muted)]">
            Add Clerk keys to enable Google, Facebook, and Apple sign-in. Guest
            checkout still works without signing in.
          </p>
          <Link href="/checkout" className="btn btn-primary mt-6 inline-flex">
            Continue as guest
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <SignIn
        forceRedirectUrl={redirectUrl}
        signUpForceRedirectUrl={redirectUrl}
      />
    </div>
  );
}
