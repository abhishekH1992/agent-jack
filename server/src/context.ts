import type { Request } from "express";
import { prisma } from "./prisma.js";
import { isStaffRole, resolvePersistedRole } from "./services/roles.js";

export type GraphQLContext = {
  req: Request;
  user: {
    id: string;
    clerkId: string;
    email: string | null;
    name: string | null;
    role: string;
  } | null;
  isAdmin: boolean;
};

export async function buildContext({ req }: { req: Request }): Promise<GraphQLContext> {
  const clerkId = (req.headers["x-clerk-user-id"] as string | undefined) || undefined;
  const roleHeader = (req.headers["x-clerk-role"] as string | undefined) || "customer";

  if (!clerkId) {
    // Local/dev admin tools can pass x-clerk-role without a Clerk session.
    return { req, user: null, isAdmin: isStaffRole(roleHeader) };
  }

  const email =
    (req.headers["x-clerk-email"] as string | undefined)?.trim() || undefined;
  const name =
    (req.headers["x-clerk-name"] as string | undefined)?.trim() || undefined;
  const existing = await prisma.user.findUnique({ where: { clerkId } });
  const role = resolvePersistedRole({
    existingRole: existing?.role,
    roleHeader,
    email,
  });

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {
      ...(email ? { email } : {}),
      ...(name ? { name } : {}),
      role,
    },
    create: {
      clerkId,
      email,
      name,
      role,
    },
  });

  return {
    req,
    user,
    isAdmin: isStaffRole(user.role) || isStaffRole(roleHeader),
  };
}

export function requireAdmin(ctx: GraphQLContext) {
  if (!ctx.isAdmin) {
    throw new Error("Admin access required");
  }
}

export function requireUser(ctx: GraphQLContext) {
  if (!ctx.user) {
    throw new Error("Sign in required");
  }
  return ctx.user;
}
