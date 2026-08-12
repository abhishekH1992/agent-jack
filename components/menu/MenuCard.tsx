"use client";

import { Button, Card } from "@heroui/react";
import { money } from "@/lib/cart";

export type MenuCardData = {
  id: string;
  name: string;
  description?: string | null;
  image?: string | null;
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
    <Card className="surface-card flex h-full flex-col overflow-hidden border-none transition duration-200 active:scale-[0.99] sm:hover:-translate-y-0.5">
      <div
        className="flex flex-1 cursor-pointer flex-col text-left"
        onClick={onClick}
      >
        <div
          className={`relative h-36 shrink-0 overflow-hidden sm:h-40 ${
            menu.image
              ? "bg-[var(--brand-soft)]"
              : menu.pricingEnabled
                ? "block-accent"
                : "bg-[linear-gradient(135deg,#ffedd5,#fdba74_45%,#fff7ed)]"
          }`}
        >
          {menu.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={menu.image}
              alt={menu.name}
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : null}
          {menu.tags && menu.tags.length > 0 ? (
            <div className="absolute bottom-3 left-3 flex max-w-[90%] flex-wrap gap-1.5">
              {menu.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-[var(--brand)]"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>
        <Card.Content className="flex flex-1 flex-col gap-2 p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 min-h-[2.5rem] font-display text-base font-bold leading-tight sm:min-h-[2.75rem] sm:text-lg">
              {menu.name}
            </h3>
            {!menu.pricingEnabled && (
              <span className="shrink-0 pt-0.5 font-semibold text-[var(--ink)]">
                {money(Number(menu.fixedPrice))}
              </span>
            )}
          </div>
          <p className="line-clamp-2 min-h-10 text-sm leading-5 text-[var(--muted)]">
            {menu.description?.trim() || "\u00a0"}
          </p>
        </Card.Content>
      </div>
      <div className="mt-auto px-4 pb-4 pt-1">
        <Button
          className={
            menu.pricingEnabled
              ? "min-h-11 w-full bg-[var(--brand)] font-bold text-white"
              : "min-h-11 w-full bg-[var(--cta)] font-semibold text-white"
          }
          onPress={onClick}
        >
          {menu.pricingEnabled ? "Bid" : "Add"}
        </Button>
      </div>
    </Card>
  );
}
