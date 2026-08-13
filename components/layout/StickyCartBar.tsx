"use client";

import Link from "next/link";
import { Button } from "@heroui/react";
import { cartTotal, money } from "@/lib/cart";
import { useCart } from "@/components/cart/CartProvider";

export function StickyCartBar() {
  const { cart, itemCount } = useCart();
  if (!itemCount || !cart?.items?.length) return null;

  const total = cartTotal(cart.items);

  return (
    <div className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-[var(--line)] bg-white/95 px-0 pt-3 shadow-[0_-8px_30px_rgba(15,23,42,0.1)] backdrop-blur">
      <div className="page-shell flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            {itemCount} item{itemCount === 1 ? "" : "s"}
          </div>
          <div className="truncate text-lg font-bold text-[var(--ink)]">
            {money(total)}
          </div>
        </div>
        <Link href="/cart" className="shrink-0 cursor-pointer">
          <Button className="min-h-12 bg-[var(--brand)] px-6 font-semibold text-white">
            View cart
          </Button>
        </Link>
      </div>
    </div>
  );
}
