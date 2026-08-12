"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { ADMIN_APPLY_STAMP } from "@/lib/queries";

export type OrderItem = {
  id: string;
  quantity: number;
  salePrice: number;
  menu?: { id: string; name: string; pricingEnabled?: boolean } | null;
  menuVariant?: { id: string; name: string } | null;
  combo?: { id: string; name: string } | null;
};

export type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  guestName?: string | null;
  guestEmail?: string | null;
  note?: string | null;
  createdAt: string;
  stampsEarned: number;
  stampRedeemed: boolean;
  pointsRedeemed: number;
  pointsDiscountNzd: number;
  pointsEarned: number;
  table?: { id: string; name: string } | null;
  user?: { id: string; name?: string | null; email?: string | null } | null;
  stampMenu?: { id: string; name: string } | null;
  memberStamp?: {
    pointsBalance: number;
    stampsBalance: number;
    stampsRequired: number;
    readyCount: number;
    canApply: boolean;
    eligibleItems: { id: string; name: string }[];
  } | null;
  items: OrderItem[];
};

export const ORDER_STATUSES = [
  "PENDING",
  "PAID",
  "FULFILLED",
  "CANCELLED",
] as const;

export const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  PAID: "bg-sky-100 text-sky-900 ring-sky-200",
  FULFILLED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-900 ring-rose-200",
};

export function itemLabel(item: OrderItem) {
  if (item.combo?.name) return item.combo.name;
  const base = item.menu?.name || "Item";
  return item.menuVariant?.name
    ? `${base} — ${item.menuVariant.name}`
    : base;
}

export function formatWhen(iso: string) {
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

export function StatusSelect({
  status,
  onChange,
  compact,
}: {
  status: string;
  onChange: (status: string) => void;
  compact?: boolean;
}) {
  return (
    <select
      aria-label="Order status"
      className={clsx(
        "cursor-pointer rounded-full font-bold uppercase tracking-wide ring-1 ring-inset outline-none",
        compact ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs",
        STATUS_STYLE[status] ||
          "bg-neutral-100 text-neutral-700 ring-neutral-200",
      )}
      value={status}
      onChange={(e) => onChange(e.target.value)}
      onClick={(e) => e.stopPropagation()}
    >
      {ORDER_STATUSES.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function OrderDetail({
  order,
  onStatus,
  onPrint,
  onApplied,
}: {
  order: Order;
  onStatus: (status: string) => void;
  onPrint: () => void;
  onApplied: () => Promise<void>;
}) {
  const stamp = order.memberStamp;
  const [stampMenuId, setStampMenuId] = useState(
    stamp?.eligibleItems[0]?.id || "",
  );
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setStampMenuId(stamp?.eligibleItems[0]?.id || "");
  }, [order.id, stamp?.eligibleItems]);

  async function applyStamp() {
    setApplying(true);
    try {
      await adminGql(ADMIN_APPLY_STAMP, {
        orderId: order.id,
        menuId: stampMenuId || null,
      });
      await onApplied();
      toast.success("Free stamp added to this order");
    } catch (err: any) {
      toast.error(err.message || "Could not apply stamp");
    } finally {
      setApplying(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            Order
          </p>
          <h2
            className="text-2xl font-bold"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {order.orderNumber}
          </h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            {formatWhen(order.createdAt)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <StatusSelect status={order.status} onChange={onStatus} />
          <button type="button" className="btn btn-primary" onClick={onPrint}>
            Print ticket
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Meta label="Table" value={order.table?.name || "—"} strong />
        <Meta label="Guest" value={order.guestName || "Guest"} />
        <Meta label="Email" value={order.guestEmail || "—"} />
        <Meta label="Total" value={money(Number(order.totalAmount))} strong />
        <Meta
          label="Points applied"
          value={
            order.pointsRedeemed > 0
              ? `${order.pointsRedeemed} pts (−${money(Number(order.pointsDiscountNzd))})`
              : "None"
          }
        />
        <Meta
          label="Stamp applied"
          value={
            order.stampRedeemed
              ? `1 free${order.stampMenu?.name ? ` ${order.stampMenu.name}` : ""}`
              : "None"
          }
        />
      </div>

      {(order.pointsRedeemed > 0 || order.pointsEarned > 0) && (
        <div className="rounded-xl border border-[var(--line)] px-3 py-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            Points
          </div>
          <p className="mt-1 text-sm">
            {order.pointsRedeemed > 0 ? (
              <>
                <span className="font-semibold">
                  {order.pointsRedeemed} points applied
                </span>
                {" · "}
                {money(Number(order.pointsDiscountNzd))} off this order
              </>
            ) : (
              <span className="text-[var(--muted)]">No points redeemed</span>
            )}
          </p>
          {order.pointsEarned > 0 ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              This order earned {order.pointsEarned} point
              {order.pointsEarned === 1 ? "" : "s"}.
            </p>
          ) : null}
        </div>
      )}

      {order.note ? (
        <div className="rounded-xl bg-[var(--page)] px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--muted)]">Note: </span>
          {order.note}
        </div>
      ) : null}

      <div className="rounded-xl border border-[var(--line)] px-3 py-3">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
          Stamp card
        </div>
        {!order.user ? (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Guest order — no stamp card. Customer must be signed in to earn
            stamps.
          </p>
        ) : !stamp ? (
          <p className="mt-1 text-sm text-[var(--muted)]">
            Stamp card is off, or this member has no card yet.
          </p>
        ) : (
          <div className="mt-2 space-y-2">
            <p className="text-sm">
              <span className="font-semibold">
                {order.user.name || order.guestName || "Member"}
              </span>
              {" · "}
              {stamp.stampsBalance} / {stamp.stampsRequired} stamps
              {stamp.readyCount > 0
                ? ` · ${stamp.readyCount} free item${stamp.readyCount === 1 ? "" : "s"} ready`
                : ""}
            </p>
            {order.stampsEarned > 0 ? (
              <p className="text-xs text-[var(--muted)]">
                This order earned {order.stampsEarned} stamp
                {order.stampsEarned === 1 ? "" : "s"}.
              </p>
            ) : null}
            {order.stampRedeemed ? (
              <p className="text-sm font-bold text-emerald-800">
                Free stamp on this order
                {order.stampMenu?.name ? `: 1× ${order.stampMenu.name}` : ""}
              </p>
            ) : stamp.canApply ? (
              <div className="space-y-2">
                {stamp.eligibleItems.length > 1 ? (
                  <select
                    className="input !py-2 text-sm"
                    value={stampMenuId}
                    onChange={(e) => setStampMenuId(e.target.value)}
                  >
                    {stamp.eligibleItems.map((item) => (
                      <option key={item.id} value={item.id}>
                        1 free {item.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-[var(--muted)]">
                    Will make 1× {stamp.eligibleItems[0]?.name} free on this
                    order.
                  </p>
                )}
                <button
                  type="button"
                  className="btn btn-primary w-full sm:w-auto"
                  disabled={applying}
                  onClick={applyStamp}
                >
                  {applying
                    ? "Applying…"
                    : `Apply ${stamp.stampsRequired} stamps to this order`}
                </button>
              </div>
            ) : stamp.eligibleItems.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                {stamp.readyCount > 0
                  ? "Member has a free item ready, but this order has no stamp-card item. Add one, then apply."
                  : `Need ${stamp.stampsRequired - (stamp.stampsBalance % stamp.stampsRequired)} more stamp${stamp.stampsRequired - (stamp.stampsBalance % stamp.stampsRequired) === 1 ? "" : "s"} for a free item.`}
              </p>
            ) : (
              <p className="text-sm text-[var(--muted)]">
                Need {stamp.stampsRequired - stamp.stampsBalance} more stamp
                {stamp.stampsRequired - stamp.stampsBalance === 1 ? "" : "s"}{" "}
                for a free item.
              </p>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Items
        </h3>
        <ul className="divide-y divide-[var(--line)] rounded-xl border border-[var(--line)]">
          {order.items.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-3 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="font-medium">
                  <span className="mr-2 inline-flex min-w-6 justify-center rounded-md bg-[var(--page)] px-1.5 py-0.5 text-xs font-bold">
                    {item.quantity}×
                  </span>
                  {itemLabel(item)}
                  {order.stampRedeemed &&
                  order.stampMenu?.id &&
                  item.menu?.id === order.stampMenu.id ? (
                    <span className="ml-2 text-[11px] font-bold uppercase text-emerald-800">
                      1 free stamp
                    </span>
                  ) : null}
                </div>
                {item.menu?.pricingEnabled ? (
                  <div className="mt-0.5 text-xs font-semibold text-[var(--brand)]">
                    Liquor bid
                  </div>
                ) : null}
              </div>
              <div className="shrink-0 font-semibold tabular-nums">
                {money(Number(item.salePrice) * item.quantity)}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Meta({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-xl border border-[var(--line)] px-3 py-2.5">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div
        className={clsx(
          "mt-0.5 truncate text-sm",
          strong ? "text-lg font-bold" : "font-medium",
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function PrintTicket({ order }: { order: Order }) {
  return (
    <div className="space-y-3 font-sans">
      <div className="border-b border-black pb-2 text-center">
        <div className="text-lg font-black tracking-wide">AGENT JACK</div>
        <div className="text-xs uppercase tracking-[0.2em]">Kitchen ticket</div>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between gap-2 text-base font-bold">
          <span>{order.orderNumber}</span>
          <span>{order.status}</span>
        </div>
        <div>Table: {order.table?.name || "—"}</div>
        <div>Guest: {order.guestName || "Guest"}</div>
        {order.guestEmail ? <div>Email: {order.guestEmail}</div> : null}
        <div>{formatWhen(order.createdAt)}</div>
      </div>

      {order.pointsRedeemed > 0 || order.stampRedeemed ? (
        <div className="border-2 border-black p-2">
          <div className="text-xs font-black uppercase tracking-wider">
            Rewards applied
          </div>
          {order.pointsRedeemed > 0 ? (
            <div className="mt-1 font-bold">
              {order.pointsRedeemed} points (−
              {money(Number(order.pointsDiscountNzd))})
            </div>
          ) : null}
          {order.stampRedeemed ? (
            <div className="mt-1 font-bold">
              STAMP: 1 FREE
              {order.stampMenu?.name ? ` ${order.stampMenu.name}` : " ITEM"}
            </div>
          ) : null}
        </div>
      ) : null}

      {order.note ? (
        <div className="border border-dashed border-black p-2">
          <strong>Note:</strong> {order.note}
        </div>
      ) : null}

      <div className="border-y border-black py-2">
        {order.items.map((item) => (
          <div key={item.id} className="mb-2 flex justify-between gap-2">
            <div>
              <div className="font-bold">
                {item.quantity}× {itemLabel(item)}
                {order.stampRedeemed &&
                order.stampMenu?.id &&
                item.menu?.id === order.stampMenu.id
                  ? " — 1 FREE STAMP"
                  : ""}
              </div>
              <div className="text-[11px]">
                @ {money(Number(item.salePrice))}
                {item.menu?.pricingEnabled ? " · bid" : ""}
              </div>
            </div>
            <div className="font-bold tabular-nums">
              {money(Number(item.salePrice) * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-between text-base font-black">
        <span>TOTAL</span>
        <span>{money(Number(order.totalAmount))}</span>
      </div>

      <div className="pt-2 text-center text-[10px] uppercase tracking-wider">
        Thank you — Agent Jack
      </div>
    </div>
  );
}
