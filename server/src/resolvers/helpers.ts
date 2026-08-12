import { Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export function dec(v: Prisma.Decimal | number | null | undefined): number | null {
  if (v == null) return null;
  return typeof v === "number" ? v : Number(v);
}

export function mapMenu(menu: any) {
  return {
    ...menu,
    description: menu.description ?? null,
    fixedPrice: Number(menu.fixedPrice),
    lowestPrice: dec(menu.lowestPrice),
    highestPrice: dec(menu.highestPrice),
    step: dec(menu.step),
    currentPrice: dec(menu.currentPrice),
    addons: menu.addons?.map((a: any) => ({ ...a, price: Number(a.price) })),
    variants: menu.variants?.map((v: any) => ({ ...v, price: Number(v.price) })),
  };
}

/** Scalar fields only — avoids Prisma rejecting unknown GraphQL keys. */
export function menuWriteData(input: any) {
  return {
    name: String(input.name || "").trim(),
    description:
      input.description == null || input.description === ""
        ? null
        : String(input.description),
    image: input.image == null || input.image === "" ? null : String(input.image),
    fixedPrice: Number(input.fixedPrice),
    lowestPrice: input.lowestPrice == null ? null : Number(input.lowestPrice),
    highestPrice: input.highestPrice == null ? null : Number(input.highestPrice),
    step: input.step == null ? null : Number(input.step),
    currentPrice:
      input.currentPrice == null
        ? Number(input.fixedPrice)
        : Number(input.currentPrice),
    pricingEnabled: Boolean(input.pricingEnabled),
    isEnable: input.isEnable !== false,
    tags: Array.isArray(input.tags)
      ? input.tags.map((t: unknown) => String(t))
      : [],
    subCategoryId: String(input.subCategoryId),
  };
}

export const menuInclude = {
  addons: true,
  variants: true,
} as const;

export const cartInclude = {
  table: true,
  items: {
    include: {
      menu: { include: menuInclude },
      menuVariant: true,
      combo: { include: { items: { include: { menu: true, menuVariant: true } } } },
      addons: { include: { menuAddon: true } },
    },
  },
} as const;

export const beltInclude = {
  category: true,
  subCategory: true,
  items: {
    orderBy: { sortOrder: "asc" as const },
    include: { menu: { include: menuInclude } },
  },
} as const;

export function validateBeltInput(input: {
  name?: string;
  sourceType: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  menuIds?: string[] | null;
}) {
  if (!input.name?.trim()) {
    throw new Error("Belt name is required");
  }
  if (input.sourceType === "CATEGORY" && !input.categoryId) {
    throw new Error("Select a category for this belt");
  }
  if (input.sourceType === "SUBCATEGORY" && !input.subCategoryId) {
    throw new Error("Select a subcategory for this belt");
  }
  if (input.sourceType === "MENUS" && !(input.menuIds?.length)) {
    throw new Error("Pick at least one menu item");
  }
}

export async function resolveBeltMenus(belt: {
  sourceType: string;
  categoryId?: string | null;
  subCategoryId?: string | null;
  items?: { menu: any; sortOrder: number }[];
}) {
  if (belt.sourceType === "MENUS") {
    return (belt.items || [])
      .filter((i) => i.menu && i.menu.isEnable !== false)
      .map((i) => mapMenu(i.menu));
  }

  if (belt.sourceType === "SUBCATEGORY" && belt.subCategoryId) {
    const menus = await prisma.menu.findMany({
      where: { subCategoryId: belt.subCategoryId, isEnable: true },
      include: menuInclude,
      orderBy: { name: "asc" },
    });
    return menus.map(mapMenu);
  }

  if (belt.sourceType === "CATEGORY" && belt.categoryId) {
    const menus = await prisma.menu.findMany({
      where: {
        isEnable: true,
        subCategory: { categoryId: belt.categoryId, isEnable: true },
      },
      include: menuInclude,
      orderBy: { name: "asc" },
    });
    return menus.map(mapMenu);
  }

  return [];
}

export function mapBelt(belt: any, menus: any[]) {
  return {
    ...belt,
    items: (belt.items || []).map((item: any) => ({
      ...item,
      menu: item.menu ? mapMenu(item.menu) : null,
    })),
    menus,
  };
}

export const pageInclude = {
  blocks: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      belt: { include: beltInclude },
    },
  },
} as const;

export function normalizeButtons(raw: unknown) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = String((item as any).label || "").trim();
      const href = String((item as any).href || "").trim();
      if (!label || !href) return null;
      const variant =
        (item as any).variant === "secondary" ? "secondary" : "primary";
      return { label, href, variant };
    })
    .filter(Boolean) as Array<{
    label: string;
    href: string;
    variant: string;
  }>;
}

export async function mapPage(page: any) {
  const blocks = await Promise.all(
    (page.blocks || []).map(async (block: any) => {
      const buttons = normalizeButtons(block.buttons);
      if (block.type === "BELT" && block.belt) {
        const menus = await resolveBeltMenus(block.belt);
        return {
          ...block,
          buttons,
          belt: mapBelt(block.belt, menus),
        };
      }
      return {
        ...block,
        buttons,
        belt: block.belt ? mapBelt(block.belt, []) : null,
      };
    }),
  );
  return { ...page, blocks };
}

export async function persistPage(input: any, id?: string) {
  const title = String(input.title || "").trim();
  if (!title) throw new Error("Page title is required");
  const slug = slugifyPage(input.slug || title);
  if (!slug) throw new Error("Page slug is required");

  const blocks: any[] = Array.isArray(input.blocks) ? input.blocks : [];
  const data = {
    title,
    slug,
    isEnable: input.isEnable ?? true,
    sortOrder: input.sortOrder ?? 0,
  };

  if (id) {
    await prisma.pageBlock.deleteMany({ where: { pageId: id } });
    const page = await prisma.page.update({
      where: { id },
      data: {
        ...data,
        blocks: {
          create: blocks.map((b, index) => mapBlockCreate(b, index)),
        },
      },
      include: pageInclude,
    });
    return mapPage(page);
  }

  const page = await prisma.page.create({
    data: {
      ...data,
      blocks: {
        create: blocks.map((b, index) => mapBlockCreate(b, index)),
      },
    },
    include: pageInclude,
  });
  return mapPage(page);
}

function mapBlockCreate(b: any, index: number) {
  return {
    type: b.type,
    sortOrder: b.sortOrder ?? index,
    isEnable: b.isEnable ?? true,
    images: b.images || [],
    imageLayout: b.imageLayout || null,
    isBanner: Boolean(b.isBanner),
    buttons: normalizeButtons(b.buttons),
    content: b.content || null,
    beltId: b.type === "BELT" ? b.beltId || null : null,
  };
}

function slugifyPage(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function persistBelt(input: any, id?: string) {
  validateBeltInput(input);

  const menuIds: string[] = input.menuIds || [];
  const data = {
    name: input.name.trim(),
    sourceType: input.sourceType,
    categoryId:
      input.sourceType === "CATEGORY" ? input.categoryId || null : null,
    subCategoryId:
      input.sourceType === "SUBCATEGORY" ? input.subCategoryId || null : null,
    isSlider: Boolean(input.isSlider),
    isEnable: input.isEnable ?? true,
    sortOrder: input.sortOrder ?? 0,
  };

  if (id) {
    await prisma.beltItem.deleteMany({ where: { beltId: id } });
    const belt = await prisma.belt.update({
      where: { id },
      data: {
        ...data,
        items:
          input.sourceType === "MENUS"
            ? {
                create: menuIds.map((menuId, index) => ({
                  menuId,
                  sortOrder: index,
                })),
              }
            : undefined,
      },
      include: beltInclude,
    });
    const menus = await resolveBeltMenus(belt);
    return mapBelt(belt, menus);
  }

  const belt = await prisma.belt.create({
    data: {
      ...data,
      items:
        input.sourceType === "MENUS"
          ? {
              create: menuIds.map((menuId, index) => ({
                menuId,
                sortOrder: index,
              })),
            }
          : undefined,
    },
    include: beltInclude,
  });
  const menus = await resolveBeltMenus(belt);
  return mapBelt(belt, menus);
}
