"use client";

import Link from "next/link";
import { Button, Card } from "@heroui/react";
import toast from "react-hot-toast";
import { cartTotal, money } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { DELETE_CART_ITEM } from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";

export default function CartPage() {
  const { cart, loading, refresh } = useCart();

  async function removeItem(id: string) {
    try {
      await gql(DELETE_CART_ITEM, { id });
      await refresh();
      toast.success("Removed");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  if (loading) {
    return (
      <div className="page-shell py-10 text-[var(--muted)]">Loading cart…</div>
    );
  }

  const items = cart?.items || [];
  const total = cartTotal(items);

  return (
    <div className="page-shell py-6 pb-32 sm:py-8">
      <h1 className="font-display mb-5 text-3xl font-bold sm:mb-6 sm:text-4xl">
        Cart
      </h1>

      {items.length === 0 ? (
        <Card className="surface-card border-none p-8 text-center">
          <p className="text-[var(--muted)]">
            Your cart is empty — time to browse.
          </p>
          <Link href="/" className="mt-4 inline-block cursor-pointer">
            <Button className="min-h-12 bg-[var(--cta)] font-semibold text-white">
              Browse menu
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-3">
            {items.map((item) => {
              const name =
                item.combo?.name ||
                [item.menu?.name, item.menuVariant?.name]
                  .filter(Boolean)
                  .join(" — ");
              const addonSum =
                item.addons?.reduce(
                  (s, a) => s + Number(a.menuAddon.price),
                  0,
                ) || 0;
              return (
                <Card
                  key={item.id}
                  className="surface-card flex flex-row items-start justify-between gap-3 border-none p-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{name}</div>
                    <div className="text-sm text-[var(--muted)]">
                      Qty {item.quantity}
                      {item.addons?.length
                        ? ` · ${item.addons.map((a) => a.menuAddon.name).join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold">
                      {money((Number(item.salePrice) + addonSum) * item.quantity)}
                    </div>
                    <button
                      type="button"
                      className="mt-2 min-h-11 cursor-pointer text-sm font-semibold text-[var(--danger)]"
                      onClick={() => removeItem(item.id)}
                    >
                      Remove
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>

          <Card className="surface-card h-fit border-none p-5">
            <div className="flex items-center justify-between text-lg">
              <span>Total</span>
              <span className="font-extrabold">{money(total)}</span>
            </div>
            <Link href="/checkout" className="mt-5 block cursor-pointer">
              <Button className="min-h-12 w-full bg-[var(--brand)] font-bold text-white">
                Checkout
              </Button>
            </Link>
          </Card>
        </div>
      )}
    </div>
  );
}
