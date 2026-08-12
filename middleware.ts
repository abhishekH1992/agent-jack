import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * When Clerk keys are configured, swap this for:
 *   export default clerkMiddleware(...)
 * and gate `/admin` with publicMetadata.role === "admin".
 * Guest checkout works without Clerk.
 */
export function middleware(_req: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
  ],
};
