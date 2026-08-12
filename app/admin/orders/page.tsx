"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { ORDERS_QUERY, UPDATE_ORDER_STATUS } from "@/lib/queries";

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
  guestEmail?: string | null;
  note?: string | null;
  createdAt: string;
  table?: { id: string; name: string } | null;
  items: OrderItem[];
};

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED"] as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900 ring-amber-200",
  PAID: "bg-sky-100 text-sky-900 ring-sky-200",
  FULFILLED: "bg-emerald-100 text-emerald-900 ring-emerald-200",
  CANCELLED: "bg-rose-100 text-rose-900 ring-rose-200",
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

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={clsx(
        "inline-flex rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ring-1 ring-inset",
        STATUS_STYLE[status] || "bg-neutral-100 text-neutral-700 ring-neutral-200",
      )}
    >
      {status}
    </span>
  );
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | (typeof STATUSES)[number]>(
    "ALL",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);

  async function load() {
    const data = await adminGql<{ orders: Order[] }>(ORDERS_QUERY);
    setOrders(data.orders);
    setSelectedId((prev) => {
      if (prev && data.orders.some((o) => o.id === prev)) return prev;
      return data.orders[0]?.id ?? null;
    });
  }

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => {
        console.error(err);
        toast.error(err?.message || "Could not load orders");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const selected =
    filtered.find((o) => o.id === selectedId) ||
    orders.find((o) => o.id === selectedId) ||
    null;

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const s of STATUSES) map[s] = 0;
    for (const o of orders) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [orders]);

  async function setStatus(id: string, status: string) {
    try {
      await adminGql(UPDATE_ORDER_STATUS, { id, status });
      await load();
      toast.success(`Marked ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  function printSelected() {
    if (!selected) {
      toast.error("Select an order first");
      return;
    }
    window.print();
  }

  return (
    <div className="space-y-6">
      <div className="no-print flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Orders
          </h1>
          <p className="text-sm text-[var(--muted)]">
            View, update status, and print kitchen tickets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() =>
              load().catch((e) => toast.error(e.message || "Refresh failed"))
            }
          >
            Refresh
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={printSelected}
            disabled={!selected}
          >
            Print ticket
          </button>
        </div>
      </div>

      <div className="no-print flex flex-wrap gap-2">
        {(["ALL", ...STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={clsx(
              "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition",
              filter === s
                ? "bg-[var(--ink)] text-white"
                : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)] hover:text-[var(--ink)]",
            )}
          >
            {s === "ALL" ? "All" : s}{" "}
            <span className="opacity-70">{counts[s] ?? 0}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="no-print surface-card rounded-2xl p-8 text-sm text-[var(--muted)]">
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="no-print surface-card rounded-2xl p-8 text-center">
          <p className="font-display text-xl font-bold">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Paid checkouts will show up here for the kitchen.
          </p>
        </div>
      ) : (
        <div className="no-print grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
          <div className="space-y-2">
            {filtered.length === 0 ? (
              <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
                No orders in this status.
              </div>
            ) : (
              filtered.map((order) => {
                const active = order.id === selected?.id;
                const itemCount = order.items.reduce(
                  (n, i) => n + i.quantity,
                  0,
                );
                return (
                  <button
                    key={order.id}
                    type="button"
                    onClick={() => setSelectedId(order.id)}
                    className={clsx(
                      "surface-card w-full rounded-2xl p-4 text-left transition",
                      active
                        ? "ring-2 ring-[var(--brand)]"
                        : "hover:bg-[#fffdf9]",
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="font-semibold tracking-wide">
                          {order.orderNumber}
                        </div>
                        <div className="mt-0.5 text-sm text-[var(--muted)]">
                          Table {order.table?.name || "—"} ·{" "}
                          {order.guestName || "Guest"} · {itemCount} item
                          {itemCount === 1 ? "" : "s"}
                        </div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatWhen(order.createdAt)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-bold text-[var(--ink)]">
                          {money(Number(order.totalAmount))}
                        </div>
                        <div className="mt-2">
                          <StatusBadge status={order.status} />
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          <div className="surface-card sticky top-20 h-fit rounded-2xl p-5 sm:p-6">
            {!selected ? (
              <p className="text-sm text-[var(--muted)]">
                Select an order to see details.
              </p>
            ) : (
              <OrderDetail
                order={selected}
                onStatus={(status) => setStatus(selected.id, status)}
                onPrint={printSelected}
              />
            )}
          </div>
        </div>
      )}

      {/* Print-only kitchen ticket */}
      {selected ? (
        <div className="print-ticket hidden">
          <PrintTicket order={selected} />
        </div>
      ) : null}
    </div>
  );
}

function OrderDetail({
  order,
  onStatus,
  onPrint,
}: {
  order: Order;
  onStatus: (status: string) => void;
  onPrint: () => void;
}) {
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
        <StatusBadge status={order.status} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Meta label="Table" value={order.table?.name || "—"} />
        <Meta label="Guest" value={order.guestName || "Guest"} />
        <Meta label="Email" value={order.guestEmail || "—"} />
        <Meta label="Total" value={money(Number(order.totalAmount))} strong />
      </div>

      {order.note ? (
        <div className="rounded-xl bg-[var(--page)] px-3 py-2 text-sm">
          <span className="font-semibold text-[var(--muted)]">Note: </span>
          {order.note}
        </div>
      ) : null}

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

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-4 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          Status
          <select
            className="input !py-2.5 text-sm font-semibold normal-case tracking-normal"
            value={order.status}
            onChange={(e) => onStatus(e.target.value)}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="btn btn-primary sm:self-end" onClick={onPrint}>
          Print ticket
        </button>
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

function PrintTicket({ order }: { order: Order }) {
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
