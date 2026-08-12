import { GraphQLScalarType, Kind } from "graphql";
import { prisma } from "../prisma.js";
import { GraphQLContext, requireAdmin, requireUser } from "../context.js";
import { generateBidChatReply } from "../services/openai.js";
import { adminForcePrice } from "../services/pricing.js";
import { createCheckoutSession } from "../services/stripe.js";
import {
  adminApplyStamp,
  getMyRewards,
  getRewardSettings,
  getStampCtx,
  mapRewardSettings,
  memberStampForOrder,
  orderAdminInclude,
  restoreRedemption,
  rewardSettingsInclude,
} from "../services/rewards.js";
import { RewardRedeemOn } from "@prisma/client";
import {
  beltInclude,
  cartInclude,
  mapBelt,
  mapMenu,
  mapPage,
  menuInclude,
  menuWriteData,
  pageInclude,
  persistBelt,
  persistPage,
  resolveBeltMenus,
  syncMenuOptions,
} from "./helpers.js";

const DateTime = new GraphQLScalarType({
  name: "DateTime",
  serialize: (v) => (v instanceof Date ? v.toISOString() : v),
  parseValue: (v) => new Date(v as string),
  parseLiteral: (ast) =>
    ast.kind === Kind.STRING ? new Date(ast.value) : null,
});

function mapOrder(o: any, stampCtx?: Awaited<ReturnType<typeof getStampCtx>>) {
  return {
    ...o,
    totalAmount: Number(o.totalAmount),
    pointsRedeemed: Number(o.pointsRedeemed || 0),
    pointsDiscountNzd: Number(o.pointsDiscountNzd || 0),
    stampRedeemed: Boolean(o.stampRedeemed),
    pointsEarned: Number(o.pointsEarned || 0),
    stampsEarned: Number(o.stampsEarned || 0),
    stampMenu: o.stampMenu ? mapMenu(o.stampMenu) : null,
    user: o.user
      ? {
          id: o.user.id,
          clerkId: o.user.clerkId,
          email: o.user.email,
          name: o.user.name,
          role: o.user.role,
        }
      : null,
    memberStamp: stampCtx ? memberStampForOrder(o, stampCtx) : null,
    items: o.items.map((i: any) => ({
      ...i,
      salePrice: Number(i.salePrice),
      menu: i.menu ? mapMenu(i.menu) : null,
    })),
  };
}

function mapAdminUser(
  user: {
    id: string;
    name: string | null;
    email: string | null;
    role: string;
    createdAt: Date;
    reward?: { pointsBalance: number; stampsBalance: number } | null;
    ledger?: {
      id: string;
      orderId: string | null;
      type: string;
      pointsDelta: number;
      stampsDelta: number;
      note: string | null;
      createdAt: Date;
    }[];
    _count?: { orders: number };
  },
  stampsRequired: number,
) {
  const pointsBalance = user.reward?.pointsBalance ?? 0;
  const stampsBalance = user.reward?.stampsBalance ?? 0;
  const required = Math.max(1, stampsRequired);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    pointsBalance,
    stampsBalance,
    stampsRequired: required,
    readyCount: Math.floor(stampsBalance / required),
    orderCount: user._count?.orders ?? 0,
    ledger: user.ledger || [],
  };
}

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
    categories: async (_: unknown, { isEnable }: { isEnable?: boolean }) => {
      const cats = await prisma.category.findMany({
        where: isEnable == null ? undefined : { isEnable },
        include: {
          categoryType: true,
          subCategories: {
            where: isEnable == null ? undefined : { isEnable: true },
            include: {
              menus: {
                where: isEnable == null ? undefined : { isEnable: true },
                include: menuInclude,
              },
            },
            orderBy: { name: "asc" },
          },
        },
        orderBy: { name: "asc" },
      });
      return cats.map((cat) => ({
        ...cat,
        subCategories: cat.subCategories.map((s) => ({
          ...s,
          menus: s.menus.map(mapMenu),
        })),
      }));
    },
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
    pages: async (_: unknown, { isEnable }: { isEnable?: boolean }) => {
      const pages = await prisma.page.findMany({
        where: isEnable == null ? undefined : { isEnable },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: pageInclude,
      });
      return Promise.all(pages.map((page) => mapPage(page)));
    },
    page: async (_: unknown, { id }: { id: string }) => {
      const page = await prisma.page.findUnique({
        where: { id },
        include: pageInclude,
      });
      return page ? mapPage(page) : null;
    },
    pageBySlug: async (_: unknown, { slug }: { slug: string }) => {
      const page = await prisma.page.findUnique({
        where: { slug },
        include: pageInclude,
      });
      if (!page || !page.isEnable) return null;
      return mapPage(page);
    },
    getCart: async (_: unknown, { id }: { id: string }) => {
      const cart = await prisma.cart.findUnique({
        where: { id },
        include: cartInclude,
      });
      return cart ? mapCart(cart) : null;
    },
    orders: async (
      _: unknown,
      { limit, userId }: { limit?: number; userId?: string | null },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const stampCtx = await getStampCtx();
      const orders = await prisma.order.findMany({
        where: userId ? { userId } : undefined,
        take: limit || 500,
        orderBy: { createdAt: "desc" },
        include: orderAdminInclude,
      });
      return orders.map((o) => mapOrder(o, stampCtx));
    },
    myOrders: async (
      _: unknown,
      { limit }: { limit?: number },
      ctx: GraphQLContext,
    ) => {
      const user = requireUser(ctx);
      const email = user.email?.trim().toLowerCase() || null;
      const orders = await prisma.order.findMany({
        where: {
          OR: [
            { userId: user.id },
            ...(email
              ? [{ guestEmail: { equals: email, mode: "insensitive" as const } }]
              : []),
          ],
        },
        take: limit || 50,
        orderBy: { createdAt: "desc" },
        include: {
          table: true,
          stampMenu: true,
          items: {
            include: { menu: true, menuVariant: true, combo: true },
          },
        },
      });
      return orders.map((o) => mapOrder(o));
    },
    order: async (_: unknown, { id }: { id: string }) => {
      const stampCtx = await getStampCtx();
      const o = await prisma.order.findUnique({
        where: { id },
        include: orderAdminInclude,
      });
      if (!o) return null;
      return mapOrder(o, stampCtx);
    },
    me: (_: unknown, __: unknown, ctx: GraphQLContext) => ctx.user,
    rewardSettings: async () => mapRewardSettings(await getRewardSettings()),
    myRewards: async (
      _: unknown,
      { cartId }: { cartId?: string | null },
      ctx: GraphQLContext,
    ) => {
      const user = requireUser(ctx);
      return getMyRewards(user.id, cartId);
    },
    adminUsers: async (_: unknown, __: unknown, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      const settings = await getRewardSettings();
      const users = await prisma.user.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          reward: true,
          _count: { select: { orders: true } },
        },
      });
      return users.map((u) => mapAdminUser(u, settings.stampsRequired));
    },
    adminUser: async (
      _: unknown,
      { id }: { id: string },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const settings = await getRewardSettings();
      const user = await prisma.user.findUnique({
        where: { id },
        include: {
          reward: true,
          _count: { select: { orders: true } },
          ledger: { orderBy: { createdAt: "desc" }, take: 100 },
        },
      });
      if (!user) return null;
      return mapAdminUser(user, settings.stampsRequired);
    },
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
        chatAttempt,
        lastReply,
        quantity,
      }: {
        menuId: string;
        amount: number;
        cartId: string;
        sessionId: string;
        chatAttempt?: number | null;
        lastReply?: string | null;
        quantity?: number | null;
      },
      ctx: GraphQLContext,
    ) => {
      const rounded = Math.round(Number(amount) * 100) / 100;
      if (!Number.isFinite(rounded) || rounded < 0) {
        throw new Error("Invalid bid amount");
      }
      const qty = Math.min(99, Math.max(1, Math.floor(Number(quantity) || 1)));
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
      // Client owns the 3-miss offer UI; this flag is informational only
      const offerLivePrice = !success && Number(chatAttempt || 0) >= 3;

      let cartItem = null;
      if (success) {
        // Price stays put until paid; then units accumulate toward unitsPerStep
        cartItem = await prisma.cartItem.create({
          data: {
            cartId,
            menuId,
            quantity: qty,
            salePrice: rounded,
          },
          include: {
            menu: { include: menuInclude },
            menuVariant: true,
            combo: true,
            addons: { include: { menuAddon: true } },
          },
        });
      }

      const refreshed = await prisma.menu.findUniqueOrThrow({
        where: { id: menuId },
      });
      const currentPrice = Number(refreshed.currentPrice ?? refreshed.fixedPrice);

      const message = await generateBidChatReply({
        menuName: menu.name,
        bidAmount: rounded,
        success,
        chatAttempt: Number(chatAttempt || failCount || 1),
        lastReply: lastReply || null,
      });

      return {
        success,
        failCount,
        offerLivePrice,
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
        redeemPoints?: boolean | null;
        redeemStampMenuId?: string | null;
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
        data: menuWriteData(input),
        include: menuInclude,
      });
      if (input.variants != null || input.addons != null) {
        await syncMenuOptions(menu.id, input);
      }
      const full = await prisma.menu.findUniqueOrThrow({
        where: { id: menu.id },
        include: menuInclude,
      });
      return mapMenu(full);
    },
    updateMenu: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      await prisma.menu.update({
        where: { id },
        data: menuWriteData(input),
      });
      if (input.variants != null || input.addons != null) {
        await syncMenuOptions(id, input);
      }
      const menu = await prisma.menu.findUniqueOrThrow({
        where: { id },
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
    storePage: async (_: unknown, { input }: { input: any }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      return persistPage(input);
    },
    updatePage: async (
      _: unknown,
      { id, input }: { id: string; input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      return persistPage(input, id);
    },
    deletePage: async (_: unknown, { id }: { id: string }, ctx: GraphQLContext) => {
      requireAdmin(ctx);
      await prisma.page.delete({ where: { id } });
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
    updateRewardSettings: async (
      _: unknown,
      { input }: { input: any },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const existing = await getRewardSettings();
      const pointsPerDollar = Number(input.pointsPerDollar ?? existing.pointsPerDollar);
      const pointsToRedeem = Math.floor(
        Number(input.pointsToRedeem ?? existing.pointsToRedeem),
      );
      const rewardAmountNzd = Number(
        input.rewardAmountNzd ?? existing.rewardAmountNzd,
      );
      const stampsRequired = Math.floor(
        Number(input.stampsRequired ?? existing.stampsRequired),
      );
      if (!Number.isFinite(pointsPerDollar) || pointsPerDollar < 0) {
        throw new Error("Points per dollar must be 0 or more");
      }
      if (!Number.isFinite(pointsToRedeem) || pointsToRedeem < 1) {
        throw new Error("Points to redeem must be at least 1");
      }
      if (!Number.isFinite(rewardAmountNzd) || rewardAmountNzd < 0) {
        throw new Error("Reward amount must be 0 or more");
      }
      if (!Number.isFinite(stampsRequired) || stampsRequired < 1) {
        throw new Error("Stamps required must be at least 1");
      }
      const redeemOn = (input.redeemOn || existing.redeemOn) as RewardRedeemOn;
      if (!["FOOD", "LIQUOR", "BOTH"].includes(redeemOn)) {
        throw new Error("Redeem on must be Food, Liquor, or Both");
      }

      await prisma.rewardSettings.update({
        where: { id: existing.id },
        data: {
          enabled: input.enabled ?? existing.enabled,
          pointsPerDollar,
          pointsToRedeem,
          rewardAmountNzd,
          redeemOn,
          stampsEnabled: input.stampsEnabled ?? existing.stampsEnabled,
          stampsRequired,
        },
      });

      if (input.stampMenuIds != null) {
        const ids = (input.stampMenuIds as string[]).filter(Boolean);
        await prisma.rewardStampMenu.deleteMany({
          where: { rewardSettingsId: existing.id },
        });
        if (ids.length) {
          await prisma.rewardStampMenu.createMany({
            data: ids.map((menuId) => ({
              rewardSettingsId: existing.id,
              menuId,
            })),
          });
        }
      }

      const updated = await prisma.rewardSettings.findUniqueOrThrow({
        where: { id: existing.id },
        include: rewardSettingsInclude,
      });
      return mapRewardSettings(updated);
    },
    updateOrderStatus: async (
      _: unknown,
      { id, status }: { id: string; status: string },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const current = await prisma.order.findUnique({ where: { id } });
      if (status === "CANCELLED" && current?.status === "PENDING") {
        await restoreRedemption(id);
      }
      const o = await prisma.order.update({
        where: { id },
        data: { status: status as any },
        include: orderAdminInclude,
      });
      return mapOrder(o, await getStampCtx());
    },
    adminApplyStamp: async (
      _: unknown,
      { orderId, menuId }: { orderId: string; menuId?: string | null },
      ctx: GraphQLContext,
    ) => {
      requireAdmin(ctx);
      const order = await adminApplyStamp(orderId, menuId);
      return mapOrder(order, await getStampCtx());
    },
  },

  CategoryType: {
    categories: (parent: any) =>
      parent.categories ||
      prisma.category.findMany({ where: { categoryTypeId: parent.id } }),
  },
};
