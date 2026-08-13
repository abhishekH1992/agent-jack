import Stripe from "stripe";
import { prisma } from "../prisma.js";
import { bumpPriceOnOrder } from "./pricing.js";
import { computeCheckoutQuote } from "./checkout-quote.js";
import {
  awardEarnForPaidOrder,
  deductRedemption,
  injectOrderId,
  orderAdminInclude,
  restoreRedemption,
} from "./rewards.js";
import { resolveTableId } from "./tables.js";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key || key.includes("replace_me")) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  return new Stripe(key);
}

async function findUserIdByEmail(email?: string | null) {
  const trimmed = email?.trim();
  if (!trimmed) return undefined;
  const user = await prisma.user.findFirst({
    where: { email: { equals: trimmed, mode: "insensitive" } },
    select: { id: true },
  });
  return user?.id;
}

export async function createCheckoutSession(input: {
  cartId: string;
  tableId?: string | null;
  guestName?: string | null;
  guestEmail?: string | null;
  userId?: string | null;
  note?: string | null;
  couponCode?: string | null;
  successUrl: string;
  cancelUrl: string;
  redeemPoints?: boolean | null;
  redeemStampMenuId?: string | null;
}) {
  const quote = await computeCheckoutQuote({
    cartId: input.cartId,
    userId: input.userId,
    redeemPoints: input.redeemPoints,
    redeemStampMenuId: input.redeemStampMenuId,
    couponCode: input.couponCode,
  });

  const {
    cart,
    settings,
    stampMenuId,
    pointsSpent,
    discountNzd,
    coupon,
    couponDiscountNzd,
    payable,
  } = quote;

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

  const stripeDiscountNzd = Math.round((discountNzd + couponDiscountNzd) * 100) / 100;
  const kitchenNote = (input.note ?? cart.note)?.trim() || undefined;
  const orderNumber = `AJ-${Date.now().toString().slice(-8)}`;
  const tableId = await resolveTableId(input.tableId || cart.tableId);
  const userId =
    input.userId ||
    cart.userId ||
    (await findUserIdByEmail(input.guestEmail));
  const order = await prisma.order.create({
    data: {
      orderNumber,
      cartId: cart.id,
      tableId,
      userId,
      guestName: input.guestName || undefined,
      guestEmail: input.guestEmail || undefined,
      note: kitchenNote,
      status: "PENDING",
      totalAmount: payable,
      pointsRedeemed: pointsSpent,
      pointsDiscountNzd: discountNzd,
      couponId: coupon?.id,
      couponCode: coupon?.code,
      couponDiscountNzd,
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
    if (userId && (pointsSpent > 0 || stampMenuId)) {
      await deductRedemption({
        userId,
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
    if (stripeDiscountNzd > 0) {
      const coupon = await stripe.coupons.create({
        amount_off: Math.round(stripeDiscountNzd * 100),
        currency: "nzd",
        duration: "once",
        name: [
          pointsSpent > 0 ? `Rewards ${pointsSpent} pts` : null,
          quote.coupon?.code ? `Promo ${quote.coupon.code}` : null,
        ]
          .filter(Boolean)
          .join(" + ") || "Discount",
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

export async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  orderIdOverride?: string | null,
) {
  const orderId = orderIdOverride || session.metadata?.orderId || undefined;
  const order = orderId
    ? await prisma.order.findUnique({
        where: { id: orderId },
        include: {
          items: { include: { menu: true } },
        },
      })
    : await prisma.order.findFirst({
        where: { stripeSessionId: session.id },
        include: {
          items: { include: { menu: true } },
        },
      });
  if (!order) return;

  const alreadyPaid =
    order.status === "PAID" || order.status === "FULFILLED";

  if (!alreadyPaid) {
    await prisma.order.update({
      where: { id: order.id },
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

  await awardEarnForPaidOrder(order.id);
}

async function attachOrderUser(
  orderId: string,
  userId?: string | null,
) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return null;
  if (order.userId) return order;
  if (userId) {
    return prisma.order.update({
      where: { id: orderId },
      data: { userId },
    });
  }
  const email = order.guestEmail?.trim();
  if (!email) return order;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });
  if (!user) return order;
  return prisma.order.update({
    where: { id: orderId },
    data: { userId: user.id },
  });
}

export async function confirmPaidOrder(input: {
  orderId?: string | null;
  sessionId?: string | null;
  userId?: string | null;
}) {
  let order = input.orderId
    ? await prisma.order.findUnique({ where: { id: input.orderId } })
    : null;
  if (!order && input.sessionId) {
    order = await prisma.order.findFirst({
      where: { stripeSessionId: input.sessionId },
    });
  }
  if (!order) {
    throw new Error("Order not found");
  }

  const attached = await attachOrderUser(order.id, input.userId);
  if (attached) order = attached;

  const sessionId = input.sessionId || order.stripeSessionId;
  if (sessionId) {
    try {
      const stripe = getStripe();
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      const paid =
        session.payment_status === "paid" ||
        session.payment_status === "no_payment_required" ||
        session.status === "complete";
      if (paid) {
        await handleCheckoutCompleted(session, order.id);
      }
    } catch (err) {
      console.error("confirmPaidOrder Stripe lookup failed", err);
    }
  } else if (order.status === "PAID" || order.status === "FULFILLED") {
    await awardEarnForPaidOrder(order.id);
  }

  const fresh = await prisma.order.findUnique({
    where: { id: order!.id },
    include: orderAdminInclude,
  });
  if (!fresh) throw new Error("Order not found");
  return fresh;
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
