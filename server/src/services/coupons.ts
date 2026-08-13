import { RewardRedeemOn } from "@prisma/client";
import { prisma } from "../prisma.js";

export function roundNzd(n: number) {
  return Math.round(n * 100) / 100;
}

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

function parseApplyOn(value: unknown): RewardRedeemOn {
  if (value === RewardRedeemOn.FOOD || value === "FOOD") {
    return RewardRedeemOn.FOOD;
  }
  if (value === RewardRedeemOn.LIQUOR || value === "LIQUOR") {
    return RewardRedeemOn.LIQUOR;
  }
  return RewardRedeemOn.BOTH;
}

export function applyOnLabel(applyOn: RewardRedeemOn | string) {
  if (applyOn === "FOOD") return "food";
  if (applyOn === "LIQUOR") return "liquor";
  return "food and liquor";
}

function asMoney(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function couponSpendBase(
  applyOn: RewardRedeemOn | string,
  subtotal: number,
  qualifyingSubtotal: number,
) {
  return applyOn === RewardRedeemOn.BOTH || applyOn === "BOTH"
    ? asMoney(subtotal)
    : asMoney(qualifyingSubtotal);
}

export function formatCouponOffer(coupon: {
  percentOff: number;
  applyOn: RewardRedeemOn | string;
  minSpendNzd?: number | null;
  maxDiscountNzd?: number | null;
}) {
  const scope = applyOnLabel(coupon.applyOn);
  const off =
    coupon.applyOn === "BOTH"
      ? `${asMoney(coupon.percentOff)}% off`
      : `${asMoney(coupon.percentOff)}% off ${scope} only`;
  const parts = [off];
  const cap = coupon.maxDiscountNzd == null ? null : asMoney(coupon.maxDiscountNzd);
  if (cap != null && cap > 0) {
    parts.push(`up to $${cap.toFixed(2)}`);
  }
  const minSpend = asMoney(coupon.minSpendNzd);
  if (minSpend > 0) {
    const spendScope =
      coupon.applyOn === "BOTH" ? "this order" : scope;
    parts.push(`min $${minSpend.toFixed(2)} ${spendScope}`);
  }
  return parts.join(" · ");
}

export function mapCoupon(coupon: any) {
  return {
    ...coupon,
    percentOff: asMoney(coupon.percentOff),
    minSpendNzd: asMoney(coupon.minSpendNzd),
    maxDiscountNzd:
      coupon.maxDiscountNzd == null ? null : asMoney(coupon.maxDiscountNzd),
    applyOn: parseApplyOn(coupon.applyOn),
  };
}

export type CouponRecord = ReturnType<typeof mapCoupon>;

export function couponUnavailableReason(
  coupon: CouponRecord,
  opts: {
    subtotal: number;
    qualifyingSubtotal: number;
    rewardsUsed: boolean;
    now?: Date;
  },
): string | null {
  const now = opts.now || new Date();
  if (!coupon.isActive) return "This coupon is no longer active";
  if (coupon.startsAt && now < new Date(coupon.startsAt)) {
    return "This coupon is not active yet";
  }
  if (coupon.expiresAt && now > new Date(coupon.expiresAt)) {
    return "This coupon has expired";
  }
  if (opts.rewardsUsed && !coupon.allowWithRewards) {
    return "This coupon cannot be used with rewards";
  }
  if (coupon.applyOn !== RewardRedeemOn.BOTH && opts.qualifyingSubtotal <= 0) {
    return `This coupon only applies to ${applyOnLabel(coupon.applyOn)} items`;
  }
  const minSpend = asMoney(coupon.minSpendNzd);
  const spendBase = couponSpendBase(
    coupon.applyOn,
    opts.subtotal,
    opts.qualifyingSubtotal,
  );
  if (minSpend > 0 && spendBase < minSpend) {
    const scope =
      coupon.applyOn === RewardRedeemOn.BOTH
        ? "this order"
        : applyOnLabel(coupon.applyOn);
    return `Spend at least $${minSpend.toFixed(2)} on ${scope} to use this coupon`;
  }
  return null;
}

export function computeCouponDiscount(opts: {
  percentOff: number;
  maxDiscountNzd: number | null;
  subtotal: number;
  remainingPayable: number;
}) {
  const subtotal = Math.max(0, asMoney(opts.subtotal));
  const raw = roundNzd((subtotal * asMoney(opts.percentOff)) / 100);
  const cap =
    opts.maxDiscountNzd == null ? null : asMoney(opts.maxDiscountNzd);
  const capped = cap == null || cap <= 0 ? raw : Math.min(raw, cap);
  const keepStripeMin = Math.max(0, roundNzd(asMoney(opts.remainingPayable) - 0.5));
  return roundNzd(
    Math.max(0, Math.min(capped, asMoney(opts.remainingPayable), keepStripeMin)),
  );
}

export async function findCouponByCode(code: string) {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return null;
  const coupon = await prisma.coupon.findUnique({
    where: { code: normalized },
  });
  return coupon ? mapCoupon(coupon) : null;
}

export function couponWriteData(input: any) {
  const code = normalizeCouponCode(String(input.code || ""));
  if (!code) throw new Error("Coupon code is required");
  const percentOff = Number(input.percentOff);
  if (!Number.isFinite(percentOff) || percentOff <= 0 || percentOff > 100) {
    throw new Error("Percent off must be between 0 and 100");
  }
  const minSpendNzd = Number(input.minSpendNzd || 0);
  if (!Number.isFinite(minSpendNzd) || minSpendNzd < 0) {
    throw new Error("Minimum spend must be 0 or more");
  }
  const maxRaw = input.maxDiscountNzd;
  const maxDiscountNzd =
    maxRaw == null || maxRaw === "" ? null : Number(maxRaw);
  if (
    maxDiscountNzd != null &&
    (!Number.isFinite(maxDiscountNzd) || maxDiscountNzd <= 0)
  ) {
    throw new Error("Up-to discount must be greater than 0");
  }
  return {
    code,
    percentOff,
    minSpendNzd,
    maxDiscountNzd,
    startsAt: parseCouponDate(input.startsAt, false),
    expiresAt: parseCouponDate(input.expiresAt, true),
    allowWithRewards: Boolean(input.allowWithRewards),
    applyOn: parseApplyOn(input.applyOn),
    isActive: input.isActive !== false,
  };
}

function parseCouponDate(value: unknown, endOfDay: boolean): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw new Error(endOfDay ? "Expiry date is invalid" : "Start date is invalid");
    }
    return value;
  }
  const raw = String(value).trim();
  if (!raw) return null;
  const day = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
  if (day && !raw.includes("Z") && !raw.includes("+") && !/[+-]\d{2}:\d{2}$/.test(raw)) {
    const year = Number(day[1]);
    const month = Number(day[2]) - 1;
    const date = Number(day[3]);
    const parsed = endOfDay
      ? new Date(year, month, date, 23, 59, 59, 999)
      : new Date(year, month, date, 0, 0, 0, 0);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(endOfDay ? "Expiry date is invalid" : "Start date is invalid");
    }
    return parsed;
  }
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(endOfDay ? "Expiry date is invalid" : "Start date is invalid");
  }
  return parsed;
}
