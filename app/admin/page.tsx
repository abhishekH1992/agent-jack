"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/config";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import {
  DASHBOARD_ORDERS_QUERY,
  LIQUOR_MENUS,
  SALES_SUMMARY_QUERY,
  TABLES_QUERY,
  TABLE_REVENUE_QUERY,
} from "@/lib/queries";

type OrderItem = {
  id: string;
  quantity: number;
  salePrice: number;
  menu?: { id: string; name: string; pricingEnabled?: boolean } | null;
};

type SellerRow = { name: string; qty: number; revenue: number };

type TableRevenue = {
  tableId: string;
  tableName: string;
  orderCount: number;
  revenue: number;
};

type SalesSummary = {
  lifetimeNzd: number;
  weekNzd: number;
  priorWeekNzd: number;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  guestName?: string | null;
  createdAt: string;
  table?: { id: string; name: string } | null;
  items: OrderItem[];
};

type LiquorMenu = {
  id: string;
  name: string;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  fixedPrice: number;
  pricingEnabled: boolean;
};

const PAID_STATUSES = new Set(["PAID", "FULFILLED"]);

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function daysAgo(n: number) {
  const x = startOfDay();
  x.setDate(x.getDate() - n);
  return x;
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeAgo(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function statusTone(status: string) {
  switch (status) {
    case "PENDING":
      return "bg-amber-100 text-amber-900";
    case "PAID":
      return "bg-amber-100 text-amber-950";
    case "FULFILLED":
      return "bg-emerald-100 text-emerald-900";
    case "CANCELLED":
      return "bg-rose-100 text-rose-900";
    default:
      return "bg-[var(--brand-soft)] text-[var(--ink)]";
  }
}

function Kpi({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
        {label}
      </div>
      <div
        className="mt-2 text-2xl font-bold tabular-nums md:text-3xl"
        style={{ color: accent || "var(--ink)" }}
      >
        {value}
      </div>
      {hint ? (
        <div className="mt-1 text-xs text-[var(--muted)]">{hint}</div>
      ) : null}
    </div>
  );
}

function TopSellersCard({
  title,
  empty,
  items,
}: {
  title: string;
  empty: string;
  items: SellerRow[];
}) {
  return (
    <div className="surface-card rounded-2xl p-4">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        By quantity across open and paid orders
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <ol className="space-y-2.5">
          {items.map((item, i) => (
            <li
              key={`${item.name}-${i}`}
              className="flex items-center justify-between gap-3 text-sm"
            >
              <div className="min-w-0">
                <span className="mr-2 text-[var(--muted)]">{i + 1}.</span>
                <span className="font-medium">{item.name}</span>
                <div className="pl-5 text-xs text-[var(--muted)]">
                  {item.qty} sold
                </div>
              </div>
              <div className="shrink-0 font-semibold tabular-nums">
                {money(item.revenue)}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function TopTableCard({
  title,
  empty,
  rows,
}: {
  title: string;
  empty: string;
  rows: TableRevenue[];
}) {
  const leader = rows[0];
  return (
    <div className="surface-card rounded-2xl p-4">
      <h2 className="mb-1 font-semibold">{title}</h2>
      <p className="mb-3 text-xs text-[var(--muted)]">
        Paid and fulfilled orders
      </p>
      {!leader ? (
        <p className="text-sm text-[var(--muted)]">{empty}</p>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--page)] p-3">
            <div className="text-xs font-medium uppercase tracking-[0.14em] text-[var(--muted)]">
              Top table
            </div>
            <div className="mt-1 text-xl font-bold">{leader.tableName}</div>
            <div className="mt-1 text-sm text-[var(--muted)]">
              {money(leader.revenue)} · {leader.orderCount} order
              {leader.orderCount === 1 ? "" : "s"}
            </div>
          </div>
          {rows.length > 1 ? (
            <ol className="space-y-2 text-sm">
              {rows.slice(1, 5).map((row, i) => (
                <li
                  key={row.tableId}
                  className="flex items-center justify-between gap-3"
                >
                  <span>
                    <span className="mr-2 text-[var(--muted)]">{i + 2}.</span>
                    {row.tableName}
                    <span className="ml-2 text-xs text-[var(--muted)]">
                      {row.orderCount} orders
                    </span>
                  </span>
                  <span className="font-semibold tabular-nums">
                    {money(row.revenue)}
                  </span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const [menus, setMenus] = useState<LiquorMenu[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [tableCount, setTableCount] = useState(0);
  const [tableRevenueAll, setTableRevenueAll] = useState<TableRevenue[]>([]);
  const [tableRevenueWeek, setTableRevenueWeek] = useState<TableRevenue[]>([]);
  const [sales, setSales] = useState<SalesSummary>({
    lifetimeNzd: 0,
    weekNzd: 0,
    priorWeekNzd: 0,
  });
  const [loadedAt, setLoadedAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [m, o, t, allTime, week, summary] = await Promise.all([
      adminGql<{ menus: LiquorMenu[] }>(LIQUOR_MENUS),
      adminGql<{ orders: Order[] }>(DASHBOARD_ORDERS_QUERY),
      adminGql<{ tables: { id: string; isActive: boolean }[] }>(TABLES_QUERY),
      adminGql<{ tableRevenue: TableRevenue[] }>(TABLE_REVENUE_QUERY),
      adminGql<{ tableRevenue: TableRevenue[] }>(TABLE_REVENUE_QUERY, {
        days: 7,
      }),
      adminGql<{ salesSummary: SalesSummary }>(SALES_SUMMARY_QUERY),
    ]);
    setMenus(m.menus);
    setOrders(o.orders);
    setTableCount(t.tables.filter((x) => x.isActive).length);
    setTableRevenueAll(allTime.tableRevenue);
    setTableRevenueWeek(week.tableRevenue);
    setSales(summary.salesSummary);
    setLoadedAt(new Date());
    setLoading(false);
  }

  useEffect(() => {
    load().catch(console.error);
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socket.on(
      "price:update",
      (payload: { menuId: string; currentPrice: number }) => {
        setMenus((prev) =>
          prev.map((menu) =>
            menu.id === payload.menuId
              ? { ...menu, currentPrice: payload.currentPrice }
              : menu,
          ),
        );
      },
    );
    const timer = setInterval(() => {
      load().catch(console.error);
    }, 30000);
    return () => {
      socket.disconnect();
      clearInterval(timer);
    };
  }, []);

  const analytics = useMemo(() => {
    const now = new Date();
    const weekStart = daysAgo(7);

    const todayOrders = orders.filter((o) =>
      isSameDay(new Date(o.createdAt), now),
    );
    const weekOrders = orders.filter(
      (o) => new Date(o.createdAt) >= weekStart,
    );

    const revenueOf = (list: Order[]) =>
      list
        .filter((o) => PAID_STATUSES.has(o.status))
        .reduce((sum, o) => sum + Number(o.totalAmount), 0);

    const todayRevenue = revenueOf(todayOrders);
    const weekRevenue = sales.weekNzd;
    const prevWeekRevenue = sales.priorWeekNzd;
    const weekDelta =
      prevWeekRevenue > 0
        ? ((weekRevenue - prevWeekRevenue) / prevWeekRevenue) * 100
        : weekRevenue > 0
          ? 100
          : 0;

    const paidToday = todayOrders.filter((o) => PAID_STATUSES.has(o.status));
    const avgOrder =
      paidToday.length > 0 ? todayRevenue / paidToday.length : 0;

    const pending = orders.filter((o) => o.status === "PENDING").length;
    const paidOpen = orders.filter((o) => o.status === "PAID").length;

    const byStatus = ["PENDING", "PAID", "FULFILLED", "CANCELLED"].map(
      (status) => ({
        status,
        count: orders.filter((o) => o.status === status).length,
      }),
    );
    const statusMax = Math.max(1, ...byStatus.map((s) => s.count));

    const foodMap = new Map<string, SellerRow>();
    const liquorMap = new Map<string, SellerRow>();
    for (const order of weekOrders) {
      // Demand signal: include pending + paid; skip cancelled
      if (order.status === "CANCELLED") continue;
      for (const item of order.items) {
        const key = item.menu?.id || item.id;
        const name = item.menu?.name || "Item";
        const bucket = item.menu?.pricingEnabled ? liquorMap : foodMap;
        const prev = bucket.get(key) || { name, qty: 0, revenue: 0 };
        prev.qty += item.quantity;
        prev.revenue += Number(item.salePrice) * item.quantity;
        bucket.set(key, prev);
      }
    }
    const rankSellers = (map: Map<string, SellerRow>) =>
      [...map.values()]
        .sort((a, b) => b.qty - a.qty || b.revenue - a.revenue)
        .slice(0, 6);
    const topFood = rankSellers(foodMap);
    const topLiquor = rankSellers(liquorMap);

    const activeTablesToday = new Set(
      todayOrders
        .filter((o) => o.status !== "CANCELLED" && o.table?.id)
        .map((o) => o.table!.id),
    ).size;

    const liquorPulse = menus
      .map((menu) => {
        const low = Number(menu.lowestPrice ?? menu.fixedPrice);
        const high = Number(menu.highestPrice ?? menu.fixedPrice);
        const current = Number(menu.currentPrice ?? menu.fixedPrice);
        const span = Math.max(high - low, 0.01);
        const pct = Math.min(100, Math.max(0, ((current - low) / span) * 100));
        let heat: "hot" | "warm" | "cool" = "warm";
        if (pct >= 75) heat = "hot";
        else if (pct <= 30) heat = "cool";
        return { ...menu, current, low, high, pct, heat };
      })
      .sort((a, b) => b.pct - a.pct);

    return {
      todayRevenue,
      todayOrderCount: todayOrders.length,
      avgOrder,
      pending,
      paidOpen,
      weekRevenue,
      prevWeekRevenue,
      weekDelta,
      lifetimeRevenue: sales.lifetimeNzd,
      byStatus,
      statusMax,
      topFood,
      topLiquor,
      activeTablesToday,
      liquorPulse,
      recent: orders.slice(0, 8),
    };
  }, [orders, menus, sales]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Today&apos;s sales, kitchen queue, and liquor demand.
          </p>
        </div>
        <div className="text-xs text-[var(--muted)]">
          {loading
            ? "Loading…"
            : loadedAt
              ? `Updated ${loadedAt.toLocaleTimeString()}`
              : null}
          <span className="ml-2 inline-flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            Live prices
          </span>
        </div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Kpi
          label="Today's sales"
          value={money(analytics.todayRevenue)}
          hint={`${analytics.todayOrderCount} order${analytics.todayOrderCount === 1 ? "" : "s"} today`}
          accent="var(--brand)"
        />
        <Kpi
          label="Avg paid order"
          value={analytics.avgOrder ? money(analytics.avgOrder) : "—"}
          hint="Paid + fulfilled today"
        />
        <Kpi
          label="Needs attention"
          value={String(analytics.pending + analytics.paidOpen)}
          hint={`${analytics.pending} pending · ${analytics.paidOpen} paid to fulfill`}
          accent={
            analytics.pending + analytics.paidOpen > 0
              ? "var(--danger)"
              : "var(--success)"
          }
        />
        <Kpi
          label="Lifetime sales"
          value={money(analytics.lifetimeRevenue)}
          hint="Paid + fulfilled, all time"
        />
        <Kpi
          label="7-day sales"
          value={money(analytics.weekRevenue)}
          hint={
            analytics.weekDelta === 0
              ? `vs prior week (${money(analytics.prevWeekRevenue)})`
              : `${analytics.weekDelta > 0 ? "+" : ""}${analytics.weekDelta.toFixed(0)}% vs prior week (${money(analytics.prevWeekRevenue)})`
          }
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="surface-card rounded-2xl p-4 sm:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Order pipeline</h2>
            <Link
              href="/admin/orders"
              className="text-xs font-medium text-[var(--cta)] hover:underline"
            >
              Manage orders →
            </Link>
          </div>
          <div className="space-y-3">
            {analytics.byStatus.map((row) => (
              <div key={row.status}>
                <div className="mb-1 flex items-center justify-between text-sm">
                  <span className="text-[var(--muted)]">{row.status}</span>
                  <span className="font-semibold tabular-nums">{row.count}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-soft)]">
                  <div
                    className="h-full rounded-full bg-[var(--brand)] transition-all"
                    style={{
                      width: `${(row.count / analytics.statusMax) * 100}%`,
                      opacity: row.status === "CANCELLED" ? 0.45 : 1,
                      background:
                        row.status === "PENDING"
                          ? "#d97706"
                          : row.status === "PAID"
                            ? "#a16207"
                            : row.status === "FULFILLED"
                              ? "#15803d"
                              : "#dc2626",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {analytics.activeTablesToday} of {tableCount || "—"} active tables
            ordered today
          </p>
        </div>

        <div className="surface-card rounded-2xl p-4">
          <h2 className="mb-3 font-semibold">Quick focus</h2>
          <ul className="space-y-3 text-sm">
            <li className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">Unpaid / pending</span>
              <span className="font-semibold tabular-nums">
                {analytics.pending}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">Ready to fulfill</span>
              <span className="font-semibold tabular-nums">
                {analytics.paidOpen}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">Live liquor items</span>
              <span className="font-semibold tabular-nums">
                {menus.length}
              </span>
            </li>
            <li className="flex justify-between gap-2">
              <span className="text-[var(--muted)]">Hot bids (≥75%)</span>
              <span className="font-semibold tabular-nums">
                {analytics.liquorPulse.filter((m) => m.heat === "hot").length}
              </span>
            </li>
          </ul>
          <Link
            href="/admin/pricing"
            className="mt-4 inline-block text-xs font-medium text-[var(--cta)] hover:underline"
          >
            Liquor pricing →
          </Link>
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <TopTableCard
          title="Most revenue · all time"
          empty="No paid table orders yet."
          rows={tableRevenueAll}
        />
        <TopTableCard
          title="Most revenue · past 7 days"
          empty="No paid table orders in the last 7 days."
          rows={tableRevenueWeek}
        />
      </section>

      <section className="grid gap-3 lg:grid-cols-2">
        <TopSellersCard
          title="Top sellers · 7 days — Food"
          empty="No food sales yet."
          items={analytics.topFood}
        />
        <TopSellersCard
          title="Top sellers · 7 days — Liquor"
          empty="No liquor sales yet."
          items={analytics.topLiquor}
        />
      </section>

      <section className="surface-card rounded-2xl p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-semibold">Liquor demand pulse</h2>
            <p className="text-xs text-[var(--muted)]">
              Where live prices sit between floor and ceiling
            </p>
          </div>
          <Link
            href="/admin/pricing"
            className="text-xs font-medium text-[var(--cta)] hover:underline"
          >
            Adjust pricing →
          </Link>
        </div>
        {analytics.liquorPulse.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No liquor items with live pricing enabled.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {analytics.liquorPulse.map((menu) => (
              <div
                key={menu.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--page)] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">
                      {menu.name}
                    </div>
                    <div className="mt-0.5 text-lg font-bold tabular-nums">
                      {money(menu.current)}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                      menu.heat === "hot"
                        ? "bg-rose-100 text-rose-800"
                        : menu.heat === "cool"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-amber-100 text-amber-800"
                    }`}
                  >
                    {menu.heat}
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white">
                  <div
                    className="h-full rounded-full bg-[var(--brand)]"
                    style={{ width: `${menu.pct}%` }}
                  />
                </div>
                <div className="mt-1.5 flex justify-between text-[10px] text-[var(--muted)]">
                  <span>{money(menu.low)}</span>
                  <span>{menu.pct.toFixed(0)}% of range</span>
                  <span>{money(menu.high)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="surface-card overflow-x-auto rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3">
          <div className="font-semibold">Recent orders</div>
          <Link
            href="/admin/orders"
            className="text-xs font-medium text-[var(--cta)] hover:underline"
          >
            View all →
          </Link>
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {analytics.recent.map((order) => {
              const itemCount = order.items.reduce(
                (n, i) => n + i.quantity,
                0,
              );
              const first = order.items[0]?.menu?.name;
              return (
                <tr key={order.id} className="border-t border-[var(--line)]">
                  <td className="px-4 py-3 font-medium">{order.orderNumber}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {timeAgo(order.createdAt)}
                  </td>
                  <td className="px-4 py-3">{order.table?.name || "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted)]">
                    {itemCount}
                    {first ? ` · ${first}${itemCount > 1 ? " +" : ""}` : ""}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-md px-2 py-0.5 text-xs font-semibold ${statusTone(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-semibold tabular-nums">
                    {money(Number(order.totalAmount))}
                  </td>
                </tr>
              );
            })}
            {analytics.recent.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={6}>
                  No orders yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
