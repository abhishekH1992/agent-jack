"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import clsx from "clsx";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { CLERK_ENABLED } from "@/lib/config";
import { useClerkGql } from "@/lib/clerk-headers";
import { MY_ORDERS_QUERY } from "@/lib/queries";

type OrderItem = {
  id: string;
  quantity: number;
  salePrice: number;
  menu?: { id: string; name: string; pricingEnabled?: boolean } | null;
  menuVariant?: { id: string; name: string } | null;
  combo?: { id: string; name: string } | null;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  guestName?: string | null;
  note?: string | null;
  createdAt: string;
  table?: { id: string; name: string } | null;
  items: OrderItem[];
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PAID: "bg-sky-100 text-sky-900",
  FULFILLED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-rose-100 text-rose-900",
};

function itemLabel(item: OrderItem) {
  if (item.combo?.name) return item.combo.name;
  const base = item.menu?.name || "Item";
  return item.menuVariant?.name
    ? `${base} — ${item.menuVariant.name}`
    : base;
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function OrdersPage() {
  if (!CLERK_ENABLED) {
    return (
      <div className="page-shell space-y-4 py-8 pb-32">
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Your orders
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Sign-in is not configured, so order history is unavailable.
        </p>
        <Link href="/menu" className="btn btn-primary !rounded-xl">
          Browse menu
        </Link>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="page-shell space-y-4 py-8 pb-32">
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Your orders
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sign in to see orders linked to your account.
          </p>
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary !rounded-xl">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <OrdersList />
      </SignedIn>
    </>
  );
}

function OrdersList() {
  const clerkGql = useClerkGql();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    clerkGql<{ myOrders: Order[] }>(MY_ORDERS_QUERY)
      .then((data) => {
        if (cancelled) return;
        setOrders(data.myOrders);
        setOpenId(data.myOrders[0]?.id ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        toast.error(err?.message || "Could not load orders");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkGql]);

  return (
    <div className="page-shell space-y-5 py-8 pb-32">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Your orders
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Past checkouts linked to your signed-in account.
        </p>
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-card space-y-4 rounded-2xl p-6">
          <p className="font-display text-xl font-bold">No orders yet</p>
          <p className="text-sm text-[var(--muted)]">
            When you pay while signed in, your orders show up here.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/menu" className="btn btn-primary !rounded-xl">
              Browse menu
            </Link>
            <Link href="/cart" className="btn btn-secondary !rounded-xl">
              View cart
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const open = openId === order.id;
            return (
              <div
                key={order.id}
                className="surface-card overflow-hidden rounded-2xl"
              >
                <button
                  type="button"
                  className="flex w-full items-start justify-between gap-3 p-4 text-left"
                  onClick={() => setOpenId(open ? null : order.id)}
                >
                  <div className="min-w-0">
                    <div className="font-semibold tracking-wide">
                      {order.orderNumber}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--muted)]">
                      Table {order.table?.name || "—"} ·{" "}
                      {formatWhen(order.createdAt)}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-bold">
                      {money(Number(order.totalAmount))}
                    </div>
                    <span
                      className={clsx(
                        "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
                        STATUS_STYLE[order.status] ||
                          "bg-neutral-100 text-neutral-700",
                      )}
                    >
                      {order.status}
                    </span>
                  </div>
                </button>

                {open ? (
                  <div className="border-t border-[var(--line)] px-4 py-3">
                    {order.note ? (
                      <p className="mb-3 text-sm text-[var(--muted)]">
                        <span className="font-semibold text-[var(--ink)]">
                          Note:{" "}
                        </span>
                        {order.note}
                      </p>
                    ) : null}
                    <ul className="space-y-2 text-sm">
                      {order.items.map((item) => (
                        <li
                          key={item.id}
                          className="flex items-start justify-between gap-3"
                        >
                          <span>
                            <span className="mr-1.5 font-bold">
                              {item.quantity}×
                            </span>
                            {itemLabel(item)}
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums">
                            {money(Number(item.salePrice) * item.quantity)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
