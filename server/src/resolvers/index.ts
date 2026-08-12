import { ChatRole } from "@prisma/client";
import { GraphQLScalarType, Kind } from "graphql";
import { prisma } from "../prisma.js";
import { GraphQLContext, requireAdmin } from "../context.js";
import { generateBidChatReply } from "../services/openai.js";
import { adminForcePrice, bumpPriceOnBid } from "../services/pricing.js";
import { createCheckoutSession } from "../services/stripe.js";
import {
  beltInclude,
  cartInclude,
  dec,
  mapBelt,
  mapMenu,
  menuInclude,
  persistBelt,
  resolveBeltMenus,
} from "./helpers.js";

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  serialize: (v) => (v instanceof Date ? v.toISOString() : v),
  parseValue: (v) => new Date(v as string),
  parseLiteral: (ast) =>
    ast.kind === Kind.STRING ? new Date(ast.value) : null,
});

function mapCart(cart: any) {
  return {
    ...cart,
    items: cart.items?.map((item: any) => ({
      ...item,
      salePrice: Number(item.salePrice),
      menu: item.menu ? mapMenu(item.menu) : null,
      menuVariant: item.menuVariant
        ? { ...item.menuVariant, price: Number(item.menuVariant.price) }
        : null,
      combo: item.combo
        ? {
            ...item.combo,
            price: Number(item.combo.price),
            items: item.combo.items || [],
          }
        : null,
      addons: item.addons?.map((a: any) => ({
        ...a,
        menuAddon: { ...a.menuAddon, price: Number(a.menuAddon.price) },
      })),
    })),
  };
}

export const resolvers = {
  DateTime,
  Query: {
    site: () => prisma.site.findFirst(),
    tables: () => prisma.table.findMany({ orderBy: { name: "asc" } }),
    table: (_: unknown, { id }: { id: string }) =>
      prisma.table.findUnique({ where: { id } }),
    categoryTypes: () =>
      prisma.categoryType.findMany({
        include: {
          categories: {
            where: { isEnable: true },
            include: {
              subCategories: {
                where: { isEnable: true },
                include: { menus: { where: { isEnable: true }, include: menuInclude } },
              },
            },
          },
        },
      }),
    categories: (_: unknown, { isEnable }: { isEnable?: boolean }) =>
      prisma.category.findMany({
        where: isEnable == null ? undefined : { isEnable },
        include: {
          categoryType: true,
          subCategories: {
            include: { menus: { include: menuInclude } },
          },
        },
        orderBy: { name: "asc" },
      }),
    categoryBySlug: async (_: unknown, { slug }: { slug: string }) => {
      const cat = await prisma.category.findUnique({
        where: { slug },
        include: {
          categoryType: true,
          subCategories: {
            where: { isEnable: true },
            include: {
              menus: { where: { isEnable: true }, include: menuInclude },
            },
          },
        },
      });
      if (!cat) return null;
      return {
        ...cat,
        subCategories: cat.subCategories.map((s) => ({
          ...s,
          menus: s.menus.map(mapMenu),
        })),
      };
    },
    menu: async (_: unknown, { id }: { id: string }) => {
      const menu = await prisma.menu.findUnique({
        where: { id },
        include: menuInclude,
      });
      return menu ? mapMenu(menu) : null;
    },
    menus: async (_: unknown, { pricingEnabled }: { pricingEnabled?: boolean }) => {
      const menus = await prisma.menu.findMany({
        where: pricingEnabled == null ? undefined : { pricingEnabled },
        include: menuInclude,
        orderBy: { name: "asc" },
      });
      return menus.map(mapMenu);
    },
    combos: async (_: unknown, { isEnable }: { isEnable?: boolean }) => {
      const combos = await prisma.combo.findMany({
        where: isEnable == null ? undefined : { isEnable },
        include: {
          items: { include: { menu: { include: menuInclude }, menuVariant: true } },
        },
      });
      return combos.map((c) => ({
        ...c,
        price: Number(c.price),
        items: c.items.map((i) => ({
          ...i,
          menu: mapMenu(i.menu),
          menuVariant: i.menuVariant
            ? { ...i.menuVariant, price: Number(i.menuVariant.price) }
            : null,
        })),
      }));
    },
    belts: async (_: unknown, { isEnable }: { isEnable?: boolean }) => {
      const belts = await prisma.belt.findMany({
        where: isEnable == null ? undefined : { isEnable },
        include: beltInclude,
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      });
      return Promise.all(
        belts.map(async (belt) => {
          const menus = await resolveBeltMenus(belt);
          return mapBelt(belt, menus);
        }),
      );
    },
    getCart: async (_: unknown, { id }: { id: string }) => {
      const cart = await prisma.cart.findUnique({
        where: { id },
        include: cartInclude,
      });
      return cart ? mapCart(cart) : null;
    },
    orders: async (_: unknown, { limit }: { limit?: number }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const orders = await prisma.order.findMany({
        take: limit || 50,
        orderBy: { createdAt: "desc" },
        include: {
          table: true,
          items: {
            include: { menu: true, menuVariant: true, combo: true },
          },
        },
      });
      return orders.map((o) => ({
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
          ...i,
          salePrice: Number(i.salePrice),
          menu: i.menu ? mapMenu(i.menu) : null,
        })),
      }));
    },
    order: async (_: unknown, { id }: { id: string }) => {
      const o = await prisma.order.findUnique({
        where: { id },
        include: {
          table: true,
          items: { include: { menu: true, menuVariant: true, combo: true } },
        },
      });
      if (!o) return null;
      return {
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
          ...i,
          salePrice: Number(i.salePrice),
          menu: i.menu ? mapMenu(i.menu) : null,
        })),
      };
    },
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => ctx.user,
  },

  Mutation: {
    createCart: async (_: unknown, { input }: { input: any }) => {
      const cart = await prisma.cart.create({
        data: {
          tableId: input.tableId || undefined,
          guestId: input.guestId || undefined,
          userId: input.userId || undefined,
          note: input.note || undefined,
        },
        include: cartInclude,
      });
      return mapCart(cart);
    },
    updateCart: async (
      _: unknown,
      { id, tableId, note }: { id: string; tableId?: string; note?: string },
    ) => {
      const cart = await prisma.cart.update({
        where: { id },
        data: {
          tableId: tableId || undefined,
          note: note ?? undefined,
        },
        include: cartInclude,
      });
      return mapCart(cart);
    },
    addCartItem: async (_: unknown, { input }: { input: any }) => {
      const item = await prisma.cartItem.create({
        data: {
          cartId: input.cartId,
          menuId: input.menuId || undefined,
          menuVariantId: input.menuVariantId || undefined,
          comboId: input.comboId || undefined,
          quantity: input.quantity,
          salePrice: input.salePrice,
          addons: input.addonIds?.length
            ? {
                create: input.addonIds.map((menuAddonId: string) => ({
                  menuAddonId,
                })),
              }
            : undefined,
        },
        include: {
          menu: { include: menuInclude },
          menuVariant: true,
          combo: true,
          addons: { include: { menuAddon: true } },
        },
      });
      return {
        ...item,
        salePrice: Number(item.salePrice),
        menu: item.menu ? mapMenu(item.menu) : null,
        menuVariant: item.menuVariant
          ? { ...item.menuVariant, price: Number(item.menuVariant.price) }
          : null,
        combo: item.combo ? { ...item.combo, price: Number(item.combo.price) } : null,
        addons: item.addons.map((a) => ({
          ...a,
          menuAddon: { ...a.menuAddon, price: Number(a.menuAddon.price) },
        })),
      };
    },
    deleteCartItem: async (_: unknown, { id }: { id: string }) => {
      await prisma.cartItem.delete({ where: { id } });
      return true;
    },
    placeBid: async (
      _: unknown,
      {
        menuId,
        amount,
        cartId,
        sessionId,
      }: { menuId: string; amount: number; cartId: string; sessionId: string },
      ctx: GraphQLContext,
    ) => {
      const rounded = Math.round(Number(amount) * 100) / 100;
      if (!Number.isFinite(rounded) || rounded < 0) {
        throw new Error("Invalid bid amount");
      }
      const menu = await prisma.menu.findUniqueOrThrow({
        where: { id: menuId },
        include: menuInclude,
      });

      if (!menu.pricingEnabled) {
        throw new Error("Bidding is not enabled for this item");
      }

      const current = Number(menu.currentPrice ?? menu.fixedPrice);
      const max = Number(menu.highestPrice ?? menu.fixedPrice);
      const success = rounded >= current && rounded <= max;

      const recentFails = await prisma.bidAttempt.count({
        where: {
          menuId,
          sessionId,
          success: false,
          createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
        },
      });

      await prisma.bidAttempt.create({
        data: {
          menuId,
          sessionId,
          amount: rounded,
          success,
          userId: ctx.user?.id,
        },
      });

      const failCount = success ? 0 : recentFails + 1;

      await prisma.chatMessage.create({
        data: {
          menuId,
          sessionId,
          userId: ctx.user?.id,
          role: ChatRole.USER,
          content: rounded.toFixed(2),
        },
      });

      let cartItem = null;
      if (success) {
        cartItem = await prisma.cartItem.create({
          data: {
            cartId,
            menuId,
            quantity: 1,
            salePrice: rounded,
          },
          include: {
            menu: { include: menuInclude },
            menuVariant: true,
            combo: true,
            addons: { include: { menuAddon: true } },
          },
        });
        await bumpPriceOnBid(menuId);
      }

      const refreshed = await prisma.menu.findUniqueOrThrow({ where: { id: menuId } });
      const currentPrice = Number(refreshed.currentPrice ?? refreshed.fixedPrice);

      const message = await generateBidChatReply({
        menuName: menu.name,
        currentPrice: success ? current : currentPrice,
        lowestPrice: Number(menu.lowestPrice ?? menu.fixedPrice),
        highestPrice: max,
        bidAmount: rounded,
        success,
        failCount,
      });

      await prisma.chatMessage.create({
        data: {
          menuId,
          sessionId,
          userId: ctx.user?.id,
          role: ChatRole.ASSISTANT,
          content: message,
        },
      });

      return {
        success,
        failCount,
        message,
        currentPrice,
        cartItem: cartItem
          ? {
              ...cartItem,
              salePrice: Number(cartItem.salePrice),
              menu: cartItem.menu ? mapMenu(cartItem.menu) : null,
              addons: [],
            }
          : null,
      };
    },
    createCheckoutSession: async (
      _: unknown,
      args: {
        cartId: string;
        tableId?: string;
        guestName?: string;
        guestEmail?: string;
        successUrl: string;
        cancelUrl: string;
      },
      ctx: GraphQLContext,
    ) => {
      return createCheckoutSession({
        ...args,
        userId: ctx.user?.id,
      });
    },
    upsertMe: async (
      _: unknown,
      args: { clerkId: string; email?: string; name?: string; role?: string },
    ) => {
      const email = args.email?.trim() || null;
      const name = args.name?.trim() || null;
      const existing = await prisma.user.findUnique({
        where: { clerkId: args.clerkId },
      });
      // Never trust client-provided role elevation; only seed admin email is promoted.
      const role =
        existing?.role === "admin" ||
        email?.toLowerCase() === "admin@example.com"
          ? "admin"
          : "customer";

      return prisma.user.upsert({
        where: { clerkId: args.clerkId },
        update: {
          ...(email ? { email } : {}),
          ...(name ? { name } : {}),
          role,
        },
        create: {
          clerkId: args.clerkId,
          email: email || undefined,
          name: name || undefined,
          role,
        },
      });
    },
    storeTable: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      return prisma.table.create({ data: input });
    },
    updateTable: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      return prisma.table.update({ where: { id }, data: input });
    },
    deleteTable: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.table.delete({ where: { id } });
      return true;
    },
    storeCategory: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const name = String(input.name || "").trim();
      if (!name) throw new Error("Category name is required");
      const slug =
        (input.slug && String(input.slug).trim()) ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      return prisma.category.create({
        data: {
          name,
          slug,
          image: input.image || null,
          isEnable: input.isEnable ?? true,
          categoryTypeId: input.categoryTypeId,
        },
        include: {
          categoryType: true,
          subCategories: { include: { menus: { include: menuInclude } } },
        },
      });
    },
    updateCategory: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const name = String(input.name || "").trim();
      if (!name) throw new Error("Category name is required");
      const slug =
        (input.slug && String(input.slug).trim()) ||
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");
      return prisma.category.update({
        where: { id },
        data: {
          name,
          slug,
          image: input.image || null,
          isEnable: input.isEnable ?? true,
          categoryTypeId: input.categoryTypeId,
        },
        include: {
          categoryType: true,
          subCategories: { include: { menus: { include: menuInclude } } },
        },
      });
    },
    deleteCategory: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.category.delete({ where: { id } });
      return true;
    },
    storeSubCategory: async (
      _: unknown,
      { input }: { input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const name = String(input.name || "").trim();
      if (!name) throw new Error("Subcategory name is required");
      return prisma.subCategory.create({
        data: {
          name,
          image: input.image || null,
          isEnable: input.isEnable ?? true,
          categoryId: input.categoryId,
        },
        include: { menus: { include: menuInclude } },
      });
    },
    updateSubCategory: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const name = String(input.name || "").trim();
      if (!name) throw new Error("Subcategory name is required");
      return prisma.subCategory.update({
        where: { id },
        data: {
          name,
          image: input.image || null,
          isEnable: input.isEnable ?? true,
          categoryId: input.categoryId,
        },
        include: { menus: { include: menuInclude } },
      });
    },
    deleteSubCategory: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      await prisma.subCategory.delete({ where: { id } });
      return true;
    },
    storeMenu: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const menu = await prisma.menu.create({
        data: {
          ...input,
          currentPrice: input.currentPrice ?? input.fixedPrice,
        },
        include: menuInclude,
      });
      return mapMenu(menu);
    },
    updateMenu: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const menu = await prisma.menu.update({
        where: { id },
        data: input,
        include: menuInclude,
      });
      return mapMenu(menu);
    },
    deleteMenu: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.menu.delete({ where: { id } });
      return true;
    },
    storeCombo: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const { items, ...rest } = input;
      const combo = await prisma.combo.create({
        data: {
          ...rest,
          items: {
            create: items.map((i: any) => ({
              menuId: i.menuId,
              menuVariantId: i.menuVariantId || undefined,
              quantity: i.quantity || 1,
            })),
          },
        },
        include: {
          items: { include: { menu: { include: menuInclude }, menuVariant: true } },
        },
      });
      return { ...combo, price: Number(combo.price) };
    },
    updateCombo: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const { items, ...rest } = input;
      await prisma.comboItem.deleteMany({ where: { comboId: id } });
      const combo = await prisma.combo.update({
        where: { id },
        data: {
          ...rest,
          items: {
            create: items.map((i: any) => ({
              menuId: i.menuId,
              menuVariantId: i.menuVariantId || undefined,
              quantity: i.quantity || 1,
            })),
          },
        },
        include: {
          items: { include: { menu: { include: menuInclude }, menuVariant: true } },
        },
      });
      return { ...combo, price: Number(combo.price) };
    },
    deleteCombo: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.combo.delete({ where: { id } });
      return true;
    },
    storeBelt: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      return persistBelt(input);
    },
    updateBelt: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      return persistBelt(input, id);
    },
    deleteBelt: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.belt.delete({ where: { id } });
      return true;
    },
    adminForcePrice: async (
      _: unknown,
      { menuId, action }: { menuId: string; action: string },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      return adminForcePrice(
        menuId,
        action as "FORCE_MAX" | "FORCE_COOLDOWN" | "PAUSE" | "RESUME",
      );
    },
    updateSite: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const existing = await prisma.site.findFirst();
      const data: {
        name?: string;
        email?: string | null;
        logo?: string | null;
        banners?: string[];
      } = {};
      if (input.name != null) data.name = input.name;
      if (input.email !== undefined) data.email = input.email;
      if (input.logo !== undefined) data.logo = input.logo;
      if (input.banners != null) data.banners = input.banners;

      if (!existing) {
        return prisma.site.create({
          data: {
            name: data.name || "Agent Jack",
            email: data.email,
            logo: data.logo,
            banners: data.banners || [],
          },
        });
      }

      return prisma.site.update({
        where: { id: existing.id },
        data: {
          ...data,
          // Prisma scalar lists need an explicit set on update
          ...(data.banners
            ? { banners: { set: data.banners } }
            : {}),
        },
      });
    },
    updateOrderStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const o = await prisma.order.update({
        where: { id },
        data: { status: status as any },
        include: {
          table: true,
          items: { include: { menu: true, menuVariant: true, combo: true } },
        },
      });
      return {
        ...o,
        totalAmount: Number(o.totalAmount),
        items: o.items.map((i) => ({
          ...i,
          salePrice: Number(i.salePrice),
          menu: i.menu ? mapMenu(i.menu) : null,
        })),
      };
    },
  },

  CategoryType: {
    categories: (parent: any) =>
      parent.categories ||
      prisma.category.findMany({ where: { categoryTypeId: parent.id } }),
  },
};
