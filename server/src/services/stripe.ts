import Stripe from "stripe";
import { prisma } from "../prisma.js";
import { bumpPriceOnOrder } from "./pricing.js";
import {
  awardEarnForPaidOrder,
  buildRewardLines,
  cartTotalFromLines,
  computePointsRedemption,
  deductRedemption,
  getRewardSettings,
  injectOrderId,
  qualifyingSubtotal,
  restoreRedemption,
  rewardCartItemInclude,
} from "./rewards.js";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("replace_me")) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

export async function createCheckoutSession(input: {
  cartId: string;
  tableId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  userId?: string | null;
  successUrl: string;
  cancelUrl: string;
  redeemPoints?: boolean | null;
  redeemStampMenuId?: string | null;
}) {
  if ((input.redeemPoints || input.redeemStampMenuId) && !input.userId) {
    throw new Error("Sign in to redeem rewards");
  }

  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: { include: rewardCartItemInclude },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const settings = await getRewardSettings();
  const lines = buildRewardLines(cart.items, settings);
  const total = cartTotalFromLines(lines);

  let stampMenuId: string | null = null;
  let stampFreeAmount = 0;
  if (
    input.redeemStampMenuId &&
    input.userId &&
    settings.enabled &&
    settings.stampsEnabled
  ) {
    const stampOk = settings.stampMenus.some(
      (s) => s.menuId === input.redeemStampMenuId,
    );
    const inCart = lines.some(
      (l) => l.menuId === input.redeemStampMenuId && l.quantity > 0,
    );
    if (!stampOk || !inCart) {
      throw new Error("That item is not on the stamp card");
    }
    const reward = await prisma.userReward.findUnique({
      where: { userId: input.userId },
    });
    if (!reward || reward.stampsBalance < settings.stampsRequired) {
      throw new Error("Not enough stamps to redeem");
    }
    stampMenuId = input.redeemStampMenuId;
    stampFreeAmount =
      lines.find((l) => l.menuId === stampMenuId)?.unitPrice || 0;
  }

  const payableAfterStamp = Math.round((total - stampFreeAmount) * 100) / 100;
  if (payableAfterStamp < 0.5) {
    throw new Error(
      "Add another item — Stripe needs a minimum charge after rewards",
    );
  }

  let pointsSpent = 0;
  let discountNzd = 0;
  if (input.redeemPoints && input.userId && settings.enabled) {
    const reward = await prisma.userReward.findUnique({
      where: { userId: input.userId },
    });
    const redemption = computePointsRedemption({
      balance: reward?.pointsBalance || 0,
      settings,
      qualifyingSubtotal: qualifyingSubtotal(lines),
      payableAfterStamp,
    });
    if (redemption.pointsSpent <= 0) {
      throw new Error("Not enough points to redeem on this order");
    }
    pointsSpent = redemption.pointsSpent;
    discountNzd = redemption.discountNzd;
  }

  const payable = Math.round((payableAfterStamp - discountNzd) * 100) / 100;
  if (payable < 0.5) {
    throw new Error(
      "Add another item — Stripe needs a minimum charge after rewards",
    );
  }

  let stampApplied = false;
  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
  for (const item of cart.items) {
    const name =
      item.combo?.name ||
      [item.menu?.name, item.menuVariant?.name].filter(Boolean).join(" — ") ||
      "Item";
    const addonTotal = item.addons.reduce(
      (sum, a) => sum + Number(a.menuAddon.price),
      0,
    );
    const unit = Number(item.salePrice) + addonTotal;
    const unitCents = Math.round(unit * 100);
    const redeemThis =
      Boolean(stampMenuId) &&
      item.menuId === stampMenuId &&
      !stampApplied &&
      item.quantity > 0;

    if (redeemThis) {
      stampApplied = true;
      const paidQty = item.quantity - 1;
      if (paidQty > 0) {
        line_items.push({
          quantity: paidQty,
          price_data: {
            currency: "nzd",
            unit_amount: unitCents,
            product_data: { name },
          },
        });
      }
      line_items.push({
        quantity: 1,
        price_data: {
          currency: "nzd",
          unit_amount: 0,
          product_data: { name: `${name} (rewards stamp)` },
        },
      });
    } else {
      line_items.push({
        quantity: item.quantity,
        price_data: {
          currency: "nzd",
          unit_amount: unitCents,
          product_data: { name },
        },
      });
    }
  }

  const orderNumber = `AJ-${Date.now().toString().slice(-8)}`;
  const order = await prisma.order.create({
    data: {
      orderNumber,
      cartId: cart.id,
      tableId: input.tableId || cart.tableId,
      userId: input.userId || cart.userId,
      guestName: input.guestName || undefined,
      guestEmail: input.guestEmail || undefined,
      note: cart.note || undefined,
      status: "PENDING",
      totalAmount: payable,
      pointsRedeemed: pointsSpent,
      pointsDiscountNzd: discountNzd,
      stampRedeemed: Boolean(stampMenuId),
      stampMenuId: stampMenuId || undefined,
      items: {
        create: cart.items.map((item) => ({
          menuId: item.menuId || undefined,
          menuVariantId: item.menuVariantId || undefined,
          comboId: item.comboId || undefined,
          quantity: item.quantity,
          salePrice: item.salePrice,
          addons: {
            create: item.addons.map((a) => ({
              menuAddonId: a.menuAddonId,
            })),
          },
        })),
      },
    },
  });

  try {
    if (input.userId && (pointsSpent > 0 || stampMenuId)) {
      await deductRedemption({
        userId: input.userId,
        orderId: order.id,
        pointsSpent,
        discountNzd,
        stampRedeemed: Boolean(stampMenuId),
        stampsRequired: settings.stampsRequired,
      });
    }
  } catch (err) {
    await prisma.order.delete({ where: { id: order.id } });
    throw err;
  }

  const stripe = getStripe();
  let couponId: string | undefined;
  try {
    if (discountNzd > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(discountNzd * 100),
        currency: "nzd",
        duration: "once",
        name: `Rewards ${pointsSpent} pts`,
      });
      couponId = coupon.id;
    }

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      success_url: injectOrderId(input.successUrl, order.id),
      cancel_url: input.cancelUrl,
      customer_email: input.guestEmail || undefined,
      discounts: couponId ? [{ coupon: couponId }] : undefined,
      metadata: {
        orderId: order.id,
        cartId: cart.id,
        tableId: order.tableId || "",
      },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });

    return { url: session.url, sessionId: session.id, orderId: order.id };
  } catch (err) {
    await restoreRedemption(order.id);
    await prisma.order.update({
      where: { id: order.id },
      data: { status: "CANCELLED" },
    });
    throw err;
  }
}

export async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: { include: { menu: true } },
    },
  });
  if (!order) return;

  const alreadyPaid =
    order.status === "PAID" || order.status === "FULFILLED";

  if (!alreadyPaid) {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "PAID" },
    });

    // Liquor live price rises only after paid order, by total qty per menu
    const qtyByMenu = new Map<string, number>();
    for (const item of order.items) {
      if (!item.menuId || !item.menu?.pricingEnabled) continue;
      qtyByMenu.set(
        item.menuId,
        (qtyByMenu.get(item.menuId) || 0) + item.quantity,
      );
    }
    for (const [menuId, units] of qtyByMenu) {
      await bumpPriceOnOrder(menuId, units);
    }

    const cartId = session.metadata?.cartId;
    if (cartId) {
      await prisma.cartItem.deleteMany({ where: { cartId } });
    }
  }

  await awardEarnForPaidOrder(orderId);
}

export async function handleCheckoutExpired(session: Stripe.Checkout.Session) {
  const orderId = session.metadata?.orderId;
  if (!orderId) return;
  await restoreRedemption(orderId);
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (order?.status === "PENDING") {
    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });
  }
}
