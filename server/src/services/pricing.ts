import { PriceEventType, Prisma } from "@prisma/client";
import { prisma } from "../prisma.js";

export type PriceBroadcast = {
  menuId: string;
  currentPrice: number;
  lowestPrice: number;
  highestPrice: number;
  step: number;
};

type IoEmitter = (event: string, payload: PriceBroadcast) => void;

let emitPrice: IoEmitter | null = null;

export function setPriceEmitter(fn: IoEmitter) {
  emitPrice = fn;
}

function toNum(v: Prisma.Decimal | number | null | undefined): number {
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v);
}

/**
 * After a paid order, accumulate sold units toward the next price step.
 *
 * Example (unitsPerStep=5, step=$0.50, current=$5):
 * - 5 Budweisers paid → price $5.50, demandUnits=0
 * - then 1 more → still $5.50, demandUnits=1
 * - need 4 more (total 5 at this level) → price $6.00
 */
export async function bumpPriceOnOrder(
  menuId: string,
  units: number,
): Promise<PriceBroadcast | null> {
  const qty = Math.max(0, Math.floor(Number(units) || 0));
  if (qty < 1) return null;

  const menu = await prisma.menu.findUniqueOrThrow({ where: { id: menuId } });
  if (!menu.pricingEnabled) return null;

  const current = toNum(menu.currentPrice ?? menu.fixedPrice);
  const max = toNum(menu.highestPrice ?? menu.fixedPrice);
  const step = toNum(menu.step ?? 0.5);
  const unitsPerStep = Math.max(1, Number(menu.unitsPerStep) || 5);
  const priorDemand = Math.max(0, Number(menu.demandUnits) || 0);

  // Always count demand (resets cooldown clock) even if already at max
  const pooled = priorDemand + qty;
  let stepsUp = 0;
  let nextDemand = pooled;

  if (current < max) {
    stepsUp = Math.floor(pooled / unitsPerStep);
    nextDemand = pooled % unitsPerStep;
  } else {
    // Cap progress once at ceiling
    nextDemand = Math.min(pooled, unitsPerStep - 1);
  }

  const nextPrice =
    stepsUp > 0
      ? Math.min(max, Number((current + step * stepsUp).toFixed(2)))
      : current;

  const updated = await prisma.menu.update({
    where: { id: menuId },
    data: {
      currentPrice: nextPrice,
      demandUnits: nextDemand,
      lastDemandAt: new Date(),
      cooldownUntil: null,
    },
  });

  if (nextPrice !== current) {
    await prisma.priceEvent.create({
      data: {
        menuId,
        type: PriceEventType.BID,
        oldPrice: current,
        newPrice: nextPrice,
      },
    });
  }

  const payload = broadcastFromMenu(updated);
  emitPrice?.("price:update", payload);
  return payload;
}

export async function runCooldownTick(): Promise<void> {
  const minutes = Number(process.env.PRICE_COOLDOWN_MINUTES || 5);
  const cutoff = new Date(Date.now() - minutes * 60 * 1000);

  const menus = await prisma.menu.findMany({
    where: {
      pricingEnabled: true,
      OR: [{ lastDemandAt: { lt: cutoff } }, { lastDemandAt: null }],
    },
  });

  for (const menu of menus) {
    const current = toNum(menu.currentPrice ?? menu.fixedPrice);
    const min = toNum(menu.lowestPrice ?? menu.fixedPrice);
    const step = toNum(menu.step ?? 0.5);
    if (current <= min) continue;

    const next = Math.max(min, Number((current - step).toFixed(2)));
    const updated = await prisma.menu.update({
      where: { id: menu.id },
      // Drop a step and clear partial demand toward the next bump
      data: { currentPrice: next, demandUnits: 0 },
    });

    await prisma.priceEvent.create({
      data: {
        menuId: menu.id,
        type: PriceEventType.COOLDOWN,
        oldPrice: current,
        newPrice: next,
      },
    });

    emitPrice?.("price:update", broadcastFromMenu(updated));
  }
}

export async function adminForcePrice(
  menuId: string,
  action: "FORCE_MAX" | "FORCE_COOLDOWN" | "PAUSE" | "RESUME",
): Promise<PriceBroadcast> {
  const menu = await prisma.menu.findUniqueOrThrow({ where: { id: menuId } });
  const current = toNum(menu.currentPrice ?? menu.fixedPrice);
  const max = toNum(menu.highestPrice ?? menu.fixedPrice);
  const min = toNum(menu.lowestPrice ?? menu.fixedPrice);

  let data: Prisma.MenuUpdateInput = {};
  let type: PriceEventType = PriceEventType.ADMIN_SET;
  let next = current;

  if (action === "FORCE_MAX") {
    next = max;
    data = { currentPrice: next, demandUnits: 0, lastDemandAt: new Date() };
    type = PriceEventType.FORCE_MAX;
  } else if (action === "FORCE_COOLDOWN") {
    next = min;
    data = { currentPrice: next, demandUnits: 0, lastDemandAt: null };
    type = PriceEventType.FORCE_COOLDOWN;
  } else if (action === "PAUSE") {
    data = { pricingEnabled: false };
  } else if (action === "RESUME") {
    data = { pricingEnabled: true };
  }

  const updated = await prisma.menu.update({ where: { id: menuId }, data });

  if (action === "FORCE_MAX" || action === "FORCE_COOLDOWN") {
    await prisma.priceEvent.create({
      data: {
        menuId,
        type,
        oldPrice: current,
        newPrice: next,
      },
    });
  }

  const payload = broadcastFromMenu(updated);
  emitPrice?.("price:update", payload);
  return payload;
}

function broadcastFromMenu(menu: {
  id: string;
  currentPrice: Prisma.Decimal | null;
  lowestPrice: Prisma.Decimal | null;
  highestPrice: Prisma.Decimal | null;
  step: Prisma.Decimal | null;
  fixedPrice: Prisma.Decimal;
}): PriceBroadcast {
  return {
    menuId: menu.id,
    currentPrice: toNum(menu.currentPrice ?? menu.fixedPrice),
    lowestPrice: toNum(menu.lowestPrice ?? menu.fixedPrice),
    highestPrice: toNum(menu.highestPrice ?? menu.fixedPrice),
    step: toNum(menu.step ?? 0.5),
  };
}

export function startCooldownJob() {
  const minutes = Number(process.env.PRICE_COOLDOWN_MINUTES || 5);
  setInterval(() => {
    runCooldownTick().catch((err) => console.error("cooldown tick failed", err));
  }, minutes * 60 * 1000);
}
