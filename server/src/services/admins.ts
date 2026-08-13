import { UserRole } from "@prisma/client";
import { prisma } from "../prisma.js";
import { isStaffRole, isSuperAdminRole } from "./roles.js";

const CLERK_API = "https://api.clerk.com/v1";

export type AdminWriteInput = {
  name: string;
  email: string;
  password: string;
};

function clerkHeaders() {
  const secret = process.env.CLERK_SECRET_KEY;
  if (!secret) return null;
  return {
    Authorization: `Bearer ${secret}`,
    "Content-Type": "application/json",
  };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function findClerkUserId(
  headers: Record<string, string>,
  email: string,
): Promise<string | null> {
  const res = await fetch(
    `${CLERK_API}/users?email_address=${encodeURIComponent(email)}`,
    { headers },
  );
  if (!res.ok) return null;
  const listed = (await res.json()) as Array<{ id: string }>;
  return listed[0]?.id || null;
}

async function upsertClerkAdmin(input: AdminWriteInput): Promise<string> {
  const headers = clerkHeaders();
  const email = normalizeEmail(input.email);
  if (!headers) {
    return `local-admin-${email}`;
  }

  const existingId = await findClerkUserId(headers, email);
  const body = {
    password: input.password,
    skip_password_checks: true,
    first_name: input.name.trim() || "Admin",
    public_metadata: { role: UserRole.admin },
  };

  if (existingId) {
    const res = await fetch(`${CLERK_API}/users/${existingId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Could not update Clerk admin (${res.status}): ${text}`);
    }
    return existingId;
  }

  const res = await fetch(`${CLERK_API}/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      email_address: [email],
      ...body,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Could not create Clerk admin (${res.status}): ${text}`);
  }
  const created = (await res.json()) as { id: string };
  return created.id;
}

async function revokeClerkAdmin(clerkId: string) {
  const headers = clerkHeaders();
  if (!headers || clerkId.startsWith("local-admin-")) return;
  const res = await fetch(`${CLERK_API}/users/${clerkId}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ public_metadata: { role: UserRole.customer } }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Could not revoke Clerk admin (${res.status}): ${text}`);
  }
}

export async function listAdmins() {
  return prisma.user.findMany({
    where: { role: { in: [UserRole.admin, UserRole.superadmin] } },
    orderBy: [{ role: "desc" }, { createdAt: "asc" }],
    include: {
      reward: true,
      _count: { select: { orders: true } },
    },
  });
}

export async function createAdmin(input: AdminWriteInput) {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  const password = input.password;
  if (!name) throw new Error("Name is required");
  if (!email || !email.includes("@")) throw new Error("A valid email is required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (existing && isStaffRole(existing.role)) {
    throw new Error("That email is already an admin");
  }

  const clerkId = await upsertClerkAdmin({ name, email, password });

  if (existing) {
    return prisma.user.update({
      where: { id: existing.id },
      data: { name, email, clerkId, role: UserRole.admin },
      include: {
        reward: true,
        _count: { select: { orders: true } },
      },
    });
  }

  return prisma.user.create({
    data: {
      clerkId,
      email,
      name,
      role: UserRole.admin,
    },
    include: {
      reward: true,
      _count: { select: { orders: true } },
    },
  });
}

export async function deleteAdmin(id: string, actorUserId?: string | null) {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !isStaffRole(user.role)) {
    throw new Error("Admin not found");
  }
  if (isSuperAdminRole(user.role)) {
    throw new Error("Superadmin cannot be deleted");
  }
  if (actorUserId && actorUserId === user.id) {
    throw new Error("You cannot remove your own admin access");
  }

  await revokeClerkAdmin(user.clerkId);
  await prisma.user.update({
    where: { id },
    data: { role: UserRole.customer },
  });
  return true;
}
