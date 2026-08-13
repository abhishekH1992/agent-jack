"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import { money } from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { ORDER_BY_ID_QUERY } from "@/lib/queries";

type OrderItem = {
  id: string;
  quantity: number;
  salePrice: number;
  menu?: { id: string; name: string } | null;
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
  pointsRedeemed: number;
  pointsDiscountNzd: number;
  stampRedeemed: boolean;
  pointsEarned: number;
  stampsEarned: number;
  couponCode?: string | null;
  couponDiscountNzd?: number;
  coupon?: { id: string; code: string; percentOff: number } | null;
  table?: { id: string; name: string } | null;
  stampMenu?: { id: string; name: string } | null;
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
  return item.menuVariant?.name ? `${base} — ${item.menuVariant.name}` : base;
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

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoading(true);
    gql<{ order: Order | null }>(ORDER_BY_ID_QUERY, { id })
      .then((data) => {
        if (cancelled) return;
        setOrder(data.order);
        if (!data.order) setError("Order not found");
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Could not load order");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="page-shell py-8 pb-32 text-sm text-[var(--muted)]">
        Loading order…
      </div>
    );
  }

  if (!order) {
    return (
      <div className="page-shell space-y-4 py-8 pb-32">
        <h1 className="font-display text-3xl font-bold sm:text-4xl">Order</h1>
        <p className="text-sm text-[var(--muted)]">
          {error || "We couldn’t find that order."}
        </p>
        <Link href="/orders" className="btn btn-secondary !rounded-xl">
          Your orders
        </Link>
      </div>
    );
  }

  return (
    <div className="page-shell space-y-5 py-8 pb-32">
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
          Order
        </p>
        <h1 className="font-display text-3xl font-bold sm:text-4xl">
          {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Table {order.table?.name || "—"} · {formatWhen(order.createdAt)}
        </p>
        <span
          className={clsx(
            "mt-2 inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase",
            STATUS_STYLE[order.status] || "bg-neutral-100 text-neutral-700",
          )}
        >
          {order.status}
        </span>
      </div>

      <div className="surface-card space-y-3 rounded-2xl p-4">
        {order.note ? (
          <p className="text-sm text-[var(--muted)]">
            <span className="font-semibold text-[var(--ink)]">
              Kitchen / allergies:{" "}
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
              <span className="min-w-0 break-words">
                <span className="mr-1.5 font-bold">{item.quantity}×</span>
                {itemLabel(item)}
                {order.stampRedeemed &&
                order.stampMenu?.id &&
                item.menu?.id === order.stampMenu.id ? (
                  <span className="ml-2 text-[11px] font-bold uppercase text-emerald-800">
                    1 free stamp
                  </span>
                ) : null}
              </span>
              <span className="shrink-0 font-semibold tabular-nums">
                {money(Number(item.salePrice) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>
        {order.pointsRedeemed > 0 ? (
          <p className="text-sm font-semibold text-sky-800">
            {order.pointsRedeemed} points applied ·{" "}
            {money(Number(order.pointsDiscountNzd))} off
          </p>
        ) : null}
        {order.stampRedeemed ? (
          <p className="text-sm font-semibold text-emerald-800">
            Stamp applied
            {order.stampMenu?.name ? `: 1 free ${order.stampMenu.name}` : ""}
          </p>
        ) : null}
        {Number(order.couponDiscountNzd) > 0 ? (
          <p className="text-sm font-semibold text-amber-800">
            Coupon {order.couponCode || order.coupon?.code} ·{" "}
            {money(Number(order.couponDiscountNzd))} off
          </p>
        ) : null}
        {(order.pointsEarned > 0 || order.stampsEarned > 0) && (
          <p className="text-sm font-semibold">
            Earned{" "}
            {[
              order.pointsEarned ? `${order.pointsEarned} points` : null,
              order.stampsEarned
                ? `${order.stampsEarned} stamp${order.stampsEarned === 1 ? "" : "s"}`
                : null,
            ]
              .filter(Boolean)
              .join(" and ")}
            .
          </p>
        )}
        <div className="flex items-center justify-between border-t border-[var(--line)] pt-3 text-lg">
          <span>Total</span>
          <span className="font-extrabold">
            {money(Number(order.totalAmount))}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/orders" className="btn btn-secondary !rounded-xl">
          All orders
        </Link>
        <Link href="/menu" className="btn btn-primary !rounded-xl">
          Back to menu
        </Link>
      </div>
    </div>
  );
}
