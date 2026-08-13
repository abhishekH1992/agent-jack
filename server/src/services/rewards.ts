import { Prisma, RewardLedgerType, RewardRedeemOn } from "@prisma/client";
import { prisma } from "../prisma.js";
import { mapMenu, menuInclude } from "../resolvers/helpers.js";

export const rewardMenuInclude = {
  subCategory: {
    include: {
      category: { include: { categoryType: true } },
    },
  },
} as const;

export const rewardCartItemInclude = {
  menu: { include: rewardMenuInclude },
  menuVariant: true,
  combo: {
    include: {
      items: {
        include: {
          menu: { include: rewardMenuInclude },
          menuVariant: true,
        },
      },
    },
  },
  addons: { include: { menuAddon: true } },
} as const;

export const rewardSettingsInclude = {
  stampMenus: {
    include: { menu: { include: { addons: true, variants: true } } },
  },
} as const;

type Settings = Prisma.RewardSettingsGetPayload<{
  include: typeof rewardSettingsInclude;
}>;

export function mapRewardSettings(s: Settings) {
  return {
    ...s,
    pointsPerDollar: Number(s.pointsPerDollar),
    rewardAmountNzd: Number(s.rewardAmountNzd),
    stampMenus: s.stampMenus.map((row) => ({
      id: row.id,
      menu: mapMenu(row.menu),
    })),
  };
}

export async function getRewardSettings() {
  const existing = await prisma.rewardSettings.findFirst({
    include: rewardSettingsInclude,
  });
  if (existing) return existing;
  return prisma.rewardSettings.create({
    data: {
      enabled: true,
      pointsPerDollar: 1,
      pointsToRedeem: 100,
      rewardAmountNzd: 5,
      redeemOn: RewardRedeemOn.BOTH,
      stampsEnabled: true,
      stampsRequired: 9,
    },
    include: rewardSettingsInclude,
  });
}

function categoryTypeName(menu: {
  subCategory?: {
    category?: { categoryType?: { name?: string | null } | null } | null;
  } | null;
} | null | undefined) {
  return menu?.subCategory?.category?.categoryType?.name || null;
}

function matchesRedeemOn(
  typeName: string | null,
  redeemOn: RewardRedeemOn,
): boolean {
  if (redeemOn === RewardRedeemOn.BOTH) return true;
  if (!typeName) return false;
  return typeName.toLowerCase() === redeemOn.toLowerCase();
}

function itemQualifies(
  item: {
    menu?: Parameters<typeof categoryTypeName>[0] | null;
    combo?: {
      items?: { menu?: Parameters<typeof categoryTypeName>[0] }[];
    } | null;
  },
  redeemOn: RewardRedeemOn,
) {
  if (item.menu) {
    return matchesRedeemOn(categoryTypeName(item.menu), redeemOn);
  }
  const comboItems = item.combo?.items || [];
  if (comboItems.length) {
    return comboItems.some((ci) =>
      matchesRedeemOn(categoryTypeName(ci.menu), redeemOn),
    );
  }
  return redeemOn === RewardRedeemOn.BOTH;
}

function comboItemWeight(ci: {
  quantity?: number;
  menu?: { fixedPrice?: Prisma.Decimal | number } | null;
  menuVariant?: { price?: Prisma.Decimal | number } | null;
}) {
  const qty = ci.quantity || 1;
  const variant =
    ci.menuVariant?.price != null ? Number(ci.menuVariant.price) : 0;
  const menu = ci.menu?.fixedPrice != null ? Number(ci.menu.fixedPrice) : 0;
  return Math.max(variant || menu || 1, 0.01) * qty;
}

/** Line amount a FOOD/LIQUOR coupon may discount (prorates mixed combos). */
function qualifyingLineAmount(
  item: Parameters<typeof buildRewardLines>[0],
  applyOn: RewardRedeemOn,
) {
  const linePrice = lineUnitPrice(item) * item.quantity;
  if (applyOn === RewardRedeemOn.BOTH) return linePrice;
  if (item.menu) {
    return matchesRedeemOn(categoryTypeName(item.menu), applyOn) ? linePrice : 0;
  }
  const comboItems = item.combo?.items || [];
  if (!comboItems.length) return 0;
  let qualifyingWeight = 0;
  let totalWeight = 0;
  for (const ci of comboItems) {
    const weight = comboItemWeight(ci);
    totalWeight += weight;
    if (matchesRedeemOn(categoryTypeName(ci.menu), applyOn)) {
      qualifyingWeight += weight;
    }
  }
  if (totalWeight <= 0 || qualifyingWeight <= 0) return 0;
  return linePrice * (qualifyingWeight / totalWeight);
}

function lineUnitPrice(item: {
  salePrice: Prisma.Decimal | number;
  addons?: { menuAddon: { price: Prisma.Decimal | number } }[];
}) {
  const addonTotal = (item.addons || []).reduce(
    (sum, a) => sum + Number(a.menuAddon.price),
    0,
  );
  return Number(item.salePrice) + addonTotal;
}

function roundMoney(n: number) {
  return Math.round(n * 100) / 100;
}

export type RewardLine = {
  menuId: string | null;
  quantity: number;
  unitPrice: number;
  qualifies: boolean;
  isStampMenu: boolean;
  name: string;
};

export function buildRewardLines(
  items: {
    menuId?: string | null;
    quantity: number;
    salePrice: Prisma.Decimal | number;
    menu?:
      | ({ name?: string | null } & Parameters<typeof categoryTypeName>[0])
      | null;
    menuVariant?: { name?: string | null } | null;
    combo?: {
      name?: string | null;
      items?: {
        quantity?: number;
        menu?: ({
          fixedPrice?: Prisma.Decimal | number;
        } & Parameters<typeof categoryTypeName>[0]) | null;
        menuVariant?: { price?: Prisma.Decimal | number } | null;
      }[];
    } | null;
    addons?: { menuAddon: { price: Prisma.Decimal | number } }[];
  }[],
  settings: Settings,
): RewardLine[] {
  const stampIds = new Set(settings.stampMenus.map((s) => s.menuId));
  return items.map((item) => {
    const name =
      item.combo?.name ||
      [item.menu?.name, item.menuVariant?.name].filter(Boolean).join(" — ") ||
      "Item";
    return {
      menuId: item.menuId || null,
      quantity: item.quantity,
      unitPrice: lineUnitPrice(item),
      qualifies: itemQualifies(item, settings.redeemOn),
      isStampMenu: Boolean(item.menuId && stampIds.has(item.menuId)),
      name,
    };
  });
}

export function catalogSubtotal(
  items: Parameters<typeof buildRewardLines>[0],
  applyOn: RewardRedeemOn,
) {
  return roundMoney(
    items.reduce(
      (sum, item) => sum + qualifyingLineAmount(item, applyOn),
      0,
    ),
  );
}

export function qualifyingSubtotal(lines: RewardLine[]) {
  return roundMoney(
    lines
      .filter((l) => l.qualifies)
      .reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
  );
}

export function cartTotalFromLines(lines: RewardLine[]) {
  return roundMoney(
    lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0),
  );
}

export function computePointsRedemption(input: {
  balance: number;
  settings: Settings;
  qualifyingSubtotal: number;
  payableAfterStamp: number;
}) {
  const { settings } = input;
  const threshold = Math.max(1, settings.pointsToRedeem);
  const reward = Number(settings.rewardAmountNzd);
  if (reward <= 0) {
    return { pointsSpent: 0, discountNzd: 0, thresholds: 0 };
  }
  const byBalance = Math.floor(input.balance / threshold);
  const bySubtotal = Math.floor(input.qualifyingSubtotal / reward);
  const maxForStripe = Math.max(0, input.payableAfterStamp - 0.5);
  const byStripe = Math.floor(maxForStripe / reward);
  const thresholds = Math.max(
    0,
    Math.min(byBalance, bySubtotal, byStripe),
  );
  return {
    thresholds,
    pointsSpent: thresholds * threshold,
    discountNzd: roundMoney(thresholds * reward),
  };
}

type Db = Prisma.TransactionClient | typeof prisma;

/** Find-or-create. Prisma upsert on a non-id unique field can INSERT and hit P2002. */
export async function ensureUserReward(userId: string, db: Db = prisma) {
  const existing = await db.userReward.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    return await db.userReward.create({ data: { userId } });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return db.userReward.findUniqueOrThrow({ where: { userId } });
    }
    throw err;
  }
}

export async function getMyRewards(userId: string, cartId?: string | null) {
  const settings = await getRewardSettings();
  const reward = await ensureUserReward(userId);
  const ledger = await prisma.rewardLedger.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  let preview = null;
  if (cartId) {
    const cart = await prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: rewardCartItemInclude } },
    });
    if (cart) {
      const lines = buildRewardLines(cart.items, settings);
      const stampMenusInCart = settings.stampMenus
        .filter((s) => lines.some((l) => l.menuId === s.menuId && l.quantity > 0))
        .map((s) => mapMenu(s.menu));
      const qual = qualifyingSubtotal(lines);
      const stampFree =
        settings.stampsEnabled &&
        reward.stampsBalance >= settings.stampsRequired &&
        stampMenusInCart.length > 0
          ? lines.find((l) => l.isStampMenu)?.unitPrice || 0
          : 0;
      const payableAfterStamp = roundMoney(
        Math.max(0, cartTotalFromLines(lines) - stampFree),
      );
      const redemption = computePointsRedemption({
        balance: reward.pointsBalance,
        settings,
        qualifyingSubtotal: qual,
        payableAfterStamp,
      });
      preview = {
        qualifyingSubtotal: qual,
        maxDiscountNzd: redemption.discountNzd,
        pointsToSpend: redemption.pointsSpent,
        canRedeemStamp:
          settings.enabled &&
          settings.stampsEnabled &&
          reward.stampsBalance >= settings.stampsRequired &&
          stampMenusInCart.length > 0,
        stampDiscountNzd: roundMoney(stampFree),
        stampMenusInCart,
      };
    }
  }

  return {
    pointsBalance: reward.pointsBalance,
    stampsBalance: reward.stampsBalance,
    settings: mapRewardSettings(settings),
    ledger: ledger.map((row) => ({
      ...row,
      createdAt: row.createdAt,
    })),
    preview,
  };
}

export async function deductRedemption(input: {
  userId: string;
  orderId: string;
  pointsSpent: number;
  discountNzd: number;
  stampRedeemed: boolean;
  stampsRequired: number;
}) {
  await prisma.$transaction(async (tx) => {
    await ensureUserReward(input.userId, tx);

    if (input.pointsSpent > 0) {
      const updated = await tx.userReward.updateMany({
        where: {
          userId: input.userId,
          pointsBalance: { gte: input.pointsSpent },
        },
        data: { pointsBalance: { decrement: input.pointsSpent } },
      });
      if (updated.count !== 1) {
        throw new Error("Not enough points to redeem");
      }
      await tx.rewardLedger.create({
        data: {
          userId: input.userId,
          orderId: input.orderId,
          type: RewardLedgerType.REDEEM_POINTS,
          pointsDelta: -input.pointsSpent,
          note: `Redeemed ${input.pointsSpent} points for $${input.discountNzd.toFixed(2)} off`,
        },
      });
    }

    if (input.stampRedeemed) {
      const updated = await tx.userReward.updateMany({
        where: {
          userId: input.userId,
          stampsBalance: { gte: input.stampsRequired },
        },
        data: { stampsBalance: { decrement: input.stampsRequired } },
      });
      if (updated.count !== 1) {
        throw new Error("Not enough stamps to redeem");
      }
      await tx.rewardLedger.create({
        data: {
          userId: input.userId,
          orderId: input.orderId,
          type: RewardLedgerType.REDEEM_STAMP,
          stampsDelta: -input.stampsRequired,
          note: `Redeemed ${input.stampsRequired} stamps for 1 free item`,
        },
      });
    }
  });
}

export async function restoreRedemption(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order?.userId) return;
  if (order.status !== "PENDING") return;
  if (!order.pointsRedeemed && !order.stampRedeemed) return;

  await prisma.$transaction(async (tx) => {
    if (order.pointsRedeemed > 0) {
      const existing = await tx.rewardLedger.findUnique({
        where: {
          orderId_type: { orderId, type: RewardLedgerType.RESTORE_POINTS },
        },
      });
      if (!existing) {
        await ensureUserReward(order.userId!, tx);
        await tx.userReward.update({
          where: { userId: order.userId! },
          data: { pointsBalance: { increment: order.pointsRedeemed } },
        });
        await tx.rewardLedger.create({
          data: {
            userId: order.userId!,
            orderId,
            type: RewardLedgerType.RESTORE_POINTS,
            pointsDelta: order.pointsRedeemed,
            note: "Restored points from unpaid checkout",
          },
        });
      }
    }

    if (order.stampRedeemed) {
      const settings = await tx.rewardSettings.findFirst();
      const stamps = settings?.stampsRequired || 9;
      const existing = await tx.rewardLedger.findUnique({
        where: {
          orderId_type: { orderId, type: RewardLedgerType.RESTORE_STAMP },
        },
      });
      if (!existing) {
        await ensureUserReward(order.userId!, tx);
        await tx.userReward.update({
          where: { userId: order.userId! },
          data: { stampsBalance: { increment: stamps } },
        });
        await tx.rewardLedger.create({
          data: {
            userId: order.userId!,
            orderId,
            type: RewardLedgerType.RESTORE_STAMP,
            stampsDelta: stamps,
            note: "Restored stamps from unpaid checkout",
          },
        });
      }
    }
  });
}

export async function awardEarnForPaidOrder(orderId: string) {
  const settings = await getRewardSettings();
  if (!settings.enabled) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: rewardCartItemInclude },
    },
  });
  if (!order?.userId) return;

  const already = await prisma.rewardLedger.findFirst({
    where: {
      orderId,
      type: { in: [RewardLedgerType.EARN_POINTS, RewardLedgerType.EARN_STAMP] },
    },
  });
  if (already) return;

  const lines = buildRewardLines(order.items, settings);
  let qualifyingPaid = 0;
  let stamps = 0;
  let stampFreeApplied = false;

  for (const line of lines) {
    let qty = line.quantity;
    let paidQty = qty;
    if (
      order.stampRedeemed &&
      !stampFreeApplied &&
      line.menuId &&
      line.menuId === order.stampMenuId &&
      qty > 0
    ) {
      paidQty = qty - 1;
      stampFreeApplied = true;
    }
    if (line.qualifies) {
      qualifyingPaid += line.unitPrice * paidQty;
    }
    if (settings.stampsEnabled && line.isStampMenu) {
      stamps += paidQty;
    }
  }

  qualifyingPaid = roundMoney(
    Math.max(0, qualifyingPaid - Number(order.pointsDiscountNzd)),
  );
  const points = Math.floor(
    qualifyingPaid * Number(settings.pointsPerDollar),
  );

  await prisma.$transaction(async (tx) => {
    await ensureUserReward(order.userId!, tx);
    await tx.userReward.update({
      where: { userId: order.userId! },
      data: {
        pointsBalance: { increment: points },
        stampsBalance: { increment: stamps },
      },
    });

    if (points > 0) {
      await tx.rewardLedger.create({
        data: {
          userId: order.userId!,
          orderId,
          type: RewardLedgerType.EARN_POINTS,
          pointsDelta: points,
          note: `Earned ${points} points on ${order.orderNumber}`,
        },
      });
    }
    if (stamps > 0) {
      await tx.rewardLedger.create({
        data: {
          userId: order.userId!,
          orderId,
          type: RewardLedgerType.EARN_STAMP,
          stampsDelta: stamps,
          note: `Earned ${stamps} stamp${stamps === 1 ? "" : "s"} on ${order.orderNumber}`,
        },
      });
    }

    await tx.order.update({
      where: { id: orderId },
      data: { pointsEarned: points, stampsEarned: stamps },
    });
  }).catch((err: { code?: string }) => {
    if (err?.code === "P2002") return;
    throw err;
  });
}

export function injectOrderId(successUrl: string, orderId: string) {
  const placeholder = "{CHECKOUT_SESSION_ID}";
  const token = "CHECKOUT_SESSION_PLACEHOLDER";
  const safe = successUrl.replaceAll(placeholder, token);
  try {
    const url = new URL(safe);
    url.searchParams.set("orderId", orderId);
    return url.toString().replaceAll(token, placeholder);
  } catch {
    const join = successUrl.includes("?") ? "&" : "?";
    return `${successUrl}${join}orderId=${encodeURIComponent(orderId)}`;
  }
}

export const orderAdminInclude = {
  table: true,
  user: { include: { reward: true } },
  stampMenu: { include: menuInclude },
  coupon: true,
  items: {
    include: {
      menu: { include: menuInclude },
      menuVariant: true,
      combo: true,
    },
  },
} as const;

export type StampCtx = {
  enabled: boolean;
  stampsEnabled: boolean;
  stampsRequired: number;
  menuIds: Set<string>;
};

export async function getStampCtx(): Promise<StampCtx> {
  const s = await getRewardSettings();
  return {
    enabled: s.enabled,
    stampsEnabled: s.stampsEnabled,
    stampsRequired: s.stampsRequired,
    menuIds: new Set(s.stampMenus.map((m) => m.menuId)),
  };
}

export function memberStampForOrder(order: {
  userId?: string | null;
  stampRedeemed?: boolean;
  status?: string;
  user?: {
    reward?: { pointsBalance: number; stampsBalance: number } | null;
  } | null;
  items?: {
    menuId?: string | null;
    menu?: unknown;
  }[];
}, ctx: StampCtx) {
  if (!order.userId || !ctx.enabled || !ctx.stampsEnabled) return null;
  const seen = new Set<string>();
  const eligibleItems: ReturnType<typeof mapMenu>[] = [];
  for (const item of order.items || []) {
    if (!item.menuId || !ctx.menuIds.has(item.menuId) || seen.has(item.menuId)) {
      continue;
    }
    seen.add(item.menuId);
    if (item.menu) eligibleItems.push(mapMenu(item.menu));
  }
  const stampsBalance = order.user?.reward?.stampsBalance ?? 0;
  const required = Math.max(1, ctx.stampsRequired);
  const readyCount = Math.floor(stampsBalance / required);
  return {
    pointsBalance: order.user?.reward?.pointsBalance ?? 0,
    stampsBalance,
    stampsRequired: required,
    readyCount,
    canApply:
      !order.stampRedeemed &&
      readyCount >= 1 &&
      eligibleItems.length > 0 &&
      order.status !== "CANCELLED",
    eligibleItems,
  };
}

export async function adminApplyStamp(orderId: string, menuId?: string | null) {
  const settings = await getRewardSettings();
  if (!settings.enabled || !settings.stampsEnabled) {
    throw new Error("Stamp card is not enabled");
  }
  const stampIds = new Set(settings.stampMenus.map((s) => s.menuId));

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menu: true } },
    },
  });
  if (!order) throw new Error("Order not found");
  if (order.status === "CANCELLED") {
    throw new Error("Cannot apply a stamp to a cancelled order");
  }
  if (!order.userId) {
    throw new Error("Guest orders have no stamp card — the customer must be signed in");
  }
  if (order.stampRedeemed) {
    throw new Error("A free stamp is already on this order");
  }

  const eligible = order.items.filter(
    (item) => item.menuId && stampIds.has(item.menuId) && item.quantity > 0,
  );
  if (!eligible.length) {
    throw new Error("This order has no stamp-card items to make free");
  }
  const chosen = menuId
    ? eligible.find((item) => item.menuId === menuId)
    : eligible[0];
  if (!chosen?.menuId) {
    throw new Error("Pick a stamp-card item that is on this order");
  }

  const reward = await ensureUserReward(order.userId);
  if (reward.stampsBalance < settings.stampsRequired) {
    throw new Error(
      `Need ${settings.stampsRequired} stamps (member has ${reward.stampsBalance})`,
    );
  }

  const unit = Number(chosen.salePrice);
  await prisma.$transaction(async (tx) => {
    const updated = await tx.userReward.updateMany({
      where: {
        userId: order.userId!,
        stampsBalance: { gte: settings.stampsRequired },
      },
      data: { stampsBalance: { decrement: settings.stampsRequired } },
    });
    if (updated.count !== 1) {
      throw new Error("Not enough stamps");
    }
    await tx.rewardLedger.create({
      data: {
        userId: order.userId!,
        orderId: order.id,
        type: RewardLedgerType.REDEEM_STAMP,
        stampsDelta: -settings.stampsRequired,
        note: `Staff applied ${settings.stampsRequired} stamps — 1 free ${chosen.menu?.name || "item"} on ${order.orderNumber}`,
      },
    });
    await tx.order.update({
      where: { id: order.id },
      data: {
        stampRedeemed: true,
        stampMenuId: chosen.menuId,
        ...(order.status === "PENDING"
          ? {
              totalAmount: Math.max(0, Number(order.totalAmount) - unit),
            }
          : {}),
      },
    });
  });

  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: orderAdminInclude,
  });
}
