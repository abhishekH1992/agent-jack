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
            <Button className="min-h-12 bg-[var(--brand)] font-semibold text-white">
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
              const image = item.combo?.image || item.menu?.image || null;
              const unit = Number(item.salePrice);
              const addonSum =
                item.addons?.reduce(
                  (s, a) => s + Number(a.menuAddon.price),
                  0,
                ) || 0;
              const unitWithAddons = unit + addonSum;
              const lineTotal = unitWithAddons * item.quantity;

              return (
                <Card
                  key={item.id}
                  className="surface-card border-none p-3 sm:p-4"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[var(--brand-soft)] sm:h-20 sm:w-20">
                      {image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={image}
                          alt=""
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center px-1 text-center text-[10px] font-bold uppercase leading-tight text-[var(--brand)]">
                          {(name || "Item").slice(0, 8)}
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="truncate font-semibold leading-snug">
                        {name || "Item"}
                      </div>
                      {item.addons?.length ? (
                        <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                          {item.addons.map((a) => a.menuAddon.name).join(", ")}
                        </div>
                      ) : null}
                      <div className="mt-1 text-sm text-[var(--muted)]">
                        Qty {item.quantity} × {money(unitWithAddons)}
                      </div>
                    </div>

                    <div className="shrink-0 text-right">
                      <div className="font-bold tabular-nums">
                        {money(lineTotal)}
                      </div>
                      <button
                        type="button"
                        className="mt-1 min-h-10 cursor-pointer text-sm font-semibold text-[var(--danger)]"
                        onClick={() => removeItem(item.id)}
                      >
                        Remove
                      </button>
                    </div>
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
