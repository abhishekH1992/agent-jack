import type { Request } from "express";
import { prisma } from "./prisma.js";

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
    return { req, user: null, isAdmin: roleHeader === "admin" };
  }

  const user = await prisma.user.upsert({
    where: { clerkId },
    update: {
      email: (req.headers["x-clerk-email"] as string) || undefined,
      name: (req.headers["x-clerk-name"] as string) || undefined,
      role: roleHeader === "admin" ? "admin" : undefined,
    },
    create: {
      clerkId,
      email: (req.headers["x-clerk-email"] as string) || undefined,
      name: (req.headers["x-clerk-name"] as string) || undefined,
      role: roleHeader === "admin" ? "admin" : "customer",
    },
  });

  return {
    req,
    user,
    isAdmin: user.role === "admin" || roleHeader === "admin",
  };
}

export function requireAdmin(ctx: GraphQLContext) {
  if (!ctx.isAdmin) {
    throw new Error("Admin access required");
  }
}
