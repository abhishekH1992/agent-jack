import { prisma } from "../prisma.js";

export async function resolveTableId(id?: string | null) {
  if (!id) return undefined;
  const row = await prisma.table.findUnique({
    where: { id },
    select: { id: true },
  });
  return row?.id;
}
