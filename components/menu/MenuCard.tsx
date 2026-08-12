"use client";

import { Button, Card } from "@heroui/react";
import { money } from "@/lib/cart";

export type MenuCardData = {
  id: string;
  name: string;
  description?: string | null;
  fixedPrice: number;
  currentPrice?: number | null;
  pricingEnabled: boolean;
  tags?: string[];
};

export function MenuCard({
  menu,
  onClick,
}: {
  menu: MenuCardData;
  onClick: () => void;
}) {
  return (
    <Card className="surface-card overflow-hidden border-none transition duration-200 active:scale-[0.99] sm:hover:-translate-y-0.5">
      <div className="cursor-pointer text-left" onClick={onClick}>
        <div
          className={`relative h-24 sm:h-28 ${
            menu.pricingEnabled
              ? "block-accent"
              : "bg-[linear-gradient(135deg,#ffedd5,#fdba74_45%,#fff7ed)]"
          }`}
        >
          <div className="absolute bottom-3 left-3">
            <span
              className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                menu.pricingEnabled
                  ? "bg-white/95 text-[var(--brand)]"
                  : "bg-[var(--cta)] text-white"
              }`}
            >
              {menu.pricingEnabled ? "Live bid" : "Kitchen"}
            </span>
          </div>
        </div>
        <Card.Content className="space-y-2 p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-display text-base font-bold leading-tight sm:text-lg">
              {menu.name}
            </h3>
            {!menu.pricingEnabled && (
              <span className="shrink-0 font-semibold text-[var(--ink)]">
                {money(Number(menu.fixedPrice))}
              </span>
            )}
          </div>
          {menu.description && (
            <p className="line-clamp-2 text-sm text-[var(--muted)]">
              {menu.description}
            </p>
          )}
        </Card.Content>
      </div>
      <div className="px-4 pb-4">
        <Button
          className={
            menu.pricingEnabled
              ? "min-h-11 w-full bg-[var(--brand)] font-bold text-white sm:w-auto"
              : "min-h-11 w-full bg-[var(--cta)] font-semibold text-white sm:w-auto"
          }
          onPress={onClick}
        >
          {menu.pricingEnabled ? "Bid" : "Add"}
        </Button>
      </div>
    </Card>
  );
}
