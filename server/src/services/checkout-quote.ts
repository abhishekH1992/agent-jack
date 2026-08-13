import { prisma } from "../prisma.js";
import {
  buildRewardLines,
  cartTotalFromLines,
  catalogSubtotal,
  computePointsRedemption,
  getRewardSettings,
  qualifyingSubtotal,
  rewardCartItemInclude,
} from "./rewards.js";
import {
  computeCouponDiscount,
  couponSpendBase,
  couponUnavailableReason,
  findCouponByCode,
  formatCouponOffer,
  type CouponRecord,
} from "./coupons.js";

export type CheckoutQuoteInput = {
  cartId: string;
  userId?: string | null;
  redeemPoints?: boolean | null;
  redeemStampMenuId?: string | null;
  couponCode?: string | null;
};

export async function computeCheckoutQuote(input: CheckoutQuoteInput) {
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
  const rewardsUsed = Boolean(input.redeemPoints || input.redeemStampMenuId);

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

  const payableAfterRewards =
    Math.round((payableAfterStamp - discountNzd) * 100) / 100;

  let coupon: CouponRecord | null = null;
  let couponDiscountNzd = 0;
  if (input.couponCode?.trim()) {
    coupon = await findCouponByCode(input.couponCode);
    if (!coupon) throw new Error("Coupon not found");
    const qualifying = catalogSubtotal(cart.items, coupon.applyOn);
    const reason = couponUnavailableReason(coupon, {
      subtotal: total,
      qualifyingSubtotal: qualifying,
      rewardsUsed,
    });
    if (reason) throw new Error(reason);
    couponDiscountNzd = computeCouponDiscount({
      percentOff: coupon.percentOff,
      maxDiscountNzd: coupon.maxDiscountNzd,
      subtotal: couponSpendBase(coupon.applyOn, total, qualifying),
      remainingPayable: payableAfterRewards,
    });
    if (couponDiscountNzd <= 0) {
      throw new Error("This coupon does not reduce this order");
    }
  }

  const payable = Math.round((payableAfterRewards - couponDiscountNzd) * 100) / 100;
  if (payable < 0.5) {
    throw new Error(
      "Add another item — Stripe needs a minimum charge after discounts",
    );
  }

  return {
    cart,
    settings,
    lines,
    total,
    stampMenuId,
    stampFreeAmount,
    pointsSpent,
    discountNzd,
    coupon,
    couponDiscountNzd,
    payable,
  };
}

const emptyPreview = {
  valid: false,
  message: "Enter a coupon code",
  code: "",
  percentOff: 0,
  discountNzd: 0,
  minSpendNzd: 0,
  maxDiscountNzd: null as number | null,
  allowWithRewards: false,
  applyOn: "BOTH" as const,
  qualifyingSubtotal: 0,
};

export async function previewCouponQuote(input: CheckoutQuoteInput) {
  try {
    if (!input.couponCode?.trim()) {
      return emptyPreview;
    }
    const quote = await computeCheckoutQuote(input);
    const applyOn = quote.coupon!.applyOn;
    return {
      valid: true,
      message: formatCouponOffer(quote.coupon!),
      code: quote.coupon!.code,
      percentOff: quote.coupon!.percentOff,
      discountNzd: quote.couponDiscountNzd,
      minSpendNzd: quote.coupon!.minSpendNzd,
      maxDiscountNzd: quote.coupon!.maxDiscountNzd,
      allowWithRewards: quote.coupon!.allowWithRewards,
      applyOn,
      qualifyingSubtotal: catalogSubtotal(quote.cart.items, applyOn),
    };
  } catch (err: any) {
    return {
      ...emptyPreview,
      message: err?.message || "Coupon could not be applied",
      code: input.couponCode?.trim().toUpperCase() || "",
    };
  }
}
