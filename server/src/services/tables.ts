import { prisma } from "../prisma.js";

export async function resolveTableId(id?: string | null) {
  if (!id) return undefined;
  const trimmed = String(id).trim();
  if (!trimmed) return undefined;

  const byId = await prisma.table.findUnique({
    where: { id: trimmed },
    select: { id: true },
  });
  if (byId) return byId.id;

  const byName = await prisma.table.findFirst({
    where: { name: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  return byName?.id;
}
