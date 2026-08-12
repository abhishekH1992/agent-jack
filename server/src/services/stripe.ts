import Stripe from "stripe";
import { prisma } from "../prisma.js";
import { bumpPriceOnOrder } from "./pricing.js";

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
}) {
  const cart = await prisma.cart.findUnique({
    where: { id: input.cartId },
    include: {
      items: {
        include: {
          menu: true,
          menuVariant: true,
          combo: true,
          addons: { include: { menuAddon: true } },
        },
      },
    },
  });

  if (!cart || cart.items.length === 0) {
    throw new Error("Cart is empty");
  }

  const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = cart.items.map(
    (item) => {
      const name =
        item.combo?.name ||
        [item.menu?.name, item.menuVariant?.name].filter(Boolean).join(" — ") ||
        "Item";
      const addonTotal = item.addons.reduce(
        (sum, a) => sum + Number(a.menuAddon.price),
        0,
      );
      const unit = Number(item.salePrice) + addonTotal;
      return {
        quantity: item.quantity,
        price_data: {
          currency: "nzd",
          unit_amount: Math.round(unit * 100),
          product_data: { name },
        },
      };
    },
  );

  const total = cart.items.reduce((sum, item) => {
    const addonTotal = item.addons.reduce(
      (s, a) => s + Number(a.menuAddon.price),
      0,
    );
    return sum + (Number(item.salePrice) + addonTotal) * item.quantity;
  }, 0);

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
      totalAmount: total,
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

  const stripe = getStripe();
  // automatic_payment_methods lets Dashboard-enabled wallets
  // (Apple Pay / Google Pay) appear on Checkout without extra SDK work.
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    customer_email: input.guestEmail || undefined,
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

  // Idempotent — Stripe may retry webhooks
  if (order.status === "PAID" || order.status === "FULFILLED") {
    return;
  }

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
