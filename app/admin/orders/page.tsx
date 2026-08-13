"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { ORDERS_QUERY, UPDATE_ORDER_STATUS } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";
import {
  ORDER_STATUSES,
  StatusSelect,
  formatWhen,
  type Order,
} from "@/components/admin/OrderDetail";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | (typeof ORDER_STATUSES)[number]>(
    "ALL",
  );
  const [tableFilter, setTableFilter] = useState("");

  const tables = useMemo(() => {
    const names = new Set<string>();
    for (const order of orders) {
      if (order.table?.name) names.add(order.table.name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  }, [orders]);

  const filtered = useMemo(() => {
    return orders.filter((order) => {
      if (filter !== "ALL" && order.status !== filter) return false;
      if (tableFilter && order.table?.name !== tableFilter) return false;
      return true;
    });
  }, [orders, filter, tableFilter]);

  const getSearchText = useCallback(
    (order: Order) =>
      [
        order.orderNumber,
        order.guestName,
        order.guestEmail,
        order.user?.name,
        order.user?.email,
        order.table?.name,
      ]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const list = usePagedSearch(filtered, getSearchText);

  async function load() {
    const data = await adminGql<{ orders: Order[] }>(ORDERS_QUERY);
    setOrders(data.orders);
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

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const s of ORDER_STATUSES) map[s] = 0;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Orders
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Scan by table and status. Open an order for the full ticket.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary !rounded-xl"
          onClick={() =>
            load().catch((e) => toast.error(e.message || "Refresh failed"))
          }
        >
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {(["ALL", ...ORDER_STATUSES] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setFilter(s);
              list.setPage(1);
            }}
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

      <div className="grid gap-2 sm:grid-cols-[12rem_minmax(0,1fr)]">
        <select
          className="input"
          value={tableFilter}
          aria-label="Filter by table"
          onChange={(e) => {
            setTableFilter(e.target.value);
            list.setPage(1);
          }}
        >
          <option value="">All tables</option>
          {tables.map((name) => (
            <option key={name} value={name}>
              Table {name}
            </option>
          ))}
        </select>
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search by order number, table, or name…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-8 text-sm text-[var(--muted)]">
          Loading orders…
        </div>
      ) : orders.length === 0 ? (
        <div className="surface-card rounded-2xl p-8 text-center">
          <p className="font-display text-xl font-bold">No orders yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Paid checkouts will show up here for the kitchen.
          </p>
        </div>
      ) : list.pageItems.length === 0 ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          No orders match this search.
        </div>
      ) : (
        <div className="space-y-2">
          {list.pageItems.map((order) => {
            const itemCount = order.items.reduce((n, i) => n + i.quantity, 0);
            return (
              <div
                key={order.id}
                className="surface-card flex items-center gap-4 rounded-2xl p-4"
              >
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="flex min-w-0 flex-1 items-center gap-4"
                >
                  <div className="min-w-[4.5rem] shrink-0">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                      Table
                    </div>
                    <div
                      className="text-2xl font-bold leading-none tracking-tight"
                      style={{ fontFamily: "var(--font-display), serif" }}
                    >
                      {order.table?.name || "—"}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold tracking-wide">
                      {order.orderNumber}
                    </div>
                    <div className="mt-1 truncate text-sm text-[var(--muted)]">
                      {order.guestName || "Guest"} · {itemCount} item
                      {itemCount === 1 ? "" : "s"} · {formatWhen(order.createdAt)}
                    </div>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <div className="font-bold tabular-nums text-[var(--ink)]">
                      {money(Number(order.totalAmount))}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-[var(--cta)]">
                      View →
                    </div>
                  </div>
                </Link>
                <StatusSelect
                  compact
                  status={order.status}
                  onChange={(status) => void setStatus(order.id, status)}
                />
              </div>
            );
          })}
        </div>
      )}

      <AdminPagination
        page={list.page}
        totalPages={list.totalPages}
        total={list.total}
        onPageChange={list.setPage}
      />
    </div>
  );
}
