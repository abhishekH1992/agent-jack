"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import clsx from "clsx";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { isStaffRole, roleLabel } from "@/lib/roles";
import {
  ADMIN_GRANT_POINTS,
  ADMIN_GRANT_STAMPS,
  ADMIN_USER_QUERY,
  ORDERS_QUERY,
} from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type Ledger = {
  id: string;
  type: string;
  pointsDelta: number;
  stampsDelta: number;
  note?: string | null;
  createdAt: string;
};

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  role: string;
  pointsBalance: number;
  stampsBalance: number;
  stampsRequired: number;
  readyCount: number;
  orderCount: number;
  ledger: Ledger[];
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  guestName?: string | null;
  createdAt: string;
  pointsRedeemed: number;
  pointsDiscountNzd: number;
  stampRedeemed: boolean;
  stampsEarned: number;
  pointsEarned: number;
  table?: { name: string } | null;
  stampMenu?: { name: string } | null;
  items: {
    id: string;
    quantity: number;
    salePrice: number;
    menu?: { name: string } | null;
    menuVariant?: { name: string } | null;
    combo?: { name: string } | null;
  }[];
};

const STATUSES = ["PENDING", "PAID", "FULFILLED", "CANCELLED"] as const;

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-900",
  PAID: "bg-sky-100 text-sky-900",
  FULFILLED: "bg-emerald-100 text-emerald-900",
  CANCELLED: "bg-rose-100 text-rose-900",
};

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

function itemLabel(item: Order["items"][number]) {
  if (item.combo?.name) return item.combo.name;
  const base = item.menu?.name || "Item";
  return item.menuVariant?.name ? `${base} — ${item.menuVariant.name}` : base;
}

export default function AdminUserDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [user, setUser] = useState<AdminUser | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"orders" | "activity">("orders");
  const [filter, setFilter] = useState<"ALL" | (typeof STATUSES)[number]>(
    "ALL",
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [pointsToAdd, setPointsToAdd] = useState("");
  const [stampsToAdd, setStampsToAdd] = useState("");
  const [grantNote, setGrantNote] = useState("");
  const [granting, setGranting] = useState<"points" | "stamps" | null>(null);

  const statusFiltered = useMemo(() => {
    if (filter === "ALL") return orders;
    return orders.filter((o) => o.status === filter);
  }, [orders, filter]);

  const getSearchText = useCallback(
    (order: Order) =>
      [order.orderNumber, order.guestName, order.table?.name]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const list = usePagedSearch(statusFiltered, getSearchText);

  const counts = useMemo(() => {
    const map: Record<string, number> = { ALL: orders.length };
    for (const s of STATUSES) map[s] = 0;
    for (const o of orders) map[o.status] = (map[o.status] || 0) + 1;
    return map;
  }, [orders]);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      adminGql<{ adminUser: AdminUser | null }>(ADMIN_USER_QUERY, { id }),
      adminGql<{ orders: Order[] }>(ORDERS_QUERY, { userId: id }),
    ])
      .then(([userData, orderData]) => {
        setUser(userData.adminUser);
        setOrders(orderData.orders);
        setOpenId(orderData.orders[0]?.id ?? null);
      })
      .catch((err) => toast.error(err.message || "Could not load user"))
      .finally(() => setLoading(false));
  }, [id]);

  async function grantPoints() {
    const points = Math.floor(Number(pointsToAdd));
    if (!Number.isFinite(points) || points < 1) {
      return toast.error("Enter at least 1 point");
    }
    setGranting("points");
    try {
      const data = await adminGql<{ adminGrantPoints: AdminUser }>(
        ADMIN_GRANT_POINTS,
        { userId: id, points, note: grantNote.trim() || null },
      );
      setUser(data.adminGrantPoints);
      setPointsToAdd("");
      setGrantNote("");
      toast.success(`Added ${points} point${points === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setGranting(null);
    }
  }

  async function grantStamps() {
    const stamps = Math.floor(Number(stampsToAdd));
    if (!Number.isFinite(stamps) || stamps < 1) {
      return toast.error("Enter at least 1 stamp");
    }
    setGranting("stamps");
    try {
      const data = await adminGql<{ adminGrantStamps: AdminUser }>(
        ADMIN_GRANT_STAMPS,
        { userId: id, stamps, note: grantNote.trim() || null },
      );
      setUser(data.adminGrantStamps);
      setStampsToAdd("");
      setGrantNote("");
      toast.success(`Added ${stamps} stamp${stamps === 1 ? "" : "s"}`);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setGranting(null);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-[var(--muted)]">Loading user…</div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">User not found.</p>
        <Link href="/admin/users" className="btn btn-secondary !rounded-xl">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/users"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Users
        </Link>
        <h1
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {user.name || "Unnamed"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          {user.email || "No email"}
          {isStaffRole(user.role) ? ` · ${roleLabel(user.role)}` : ""}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Points" value={String(user.pointsBalance)} />
        <Stat
          label="Stamps"
          value={`${user.stampsBalance} / ${user.stampsRequired}`}
        />
        <Stat
          label="Rewards ready"
          value={
            user.readyCount > 0
              ? `${user.readyCount} free stamp${user.readyCount === 1 ? "" : "s"}`
              : "—"
          }
        />
        <Stat label="Orders" value={String(user.orderCount)} />
      </div>

      <div className="surface-card space-y-3 rounded-2xl p-4">
        <h2 className="font-semibold">Add rewards</h2>
        <p className="text-sm text-[var(--muted)]">
          Credit points or stamps to this member. It shows up in their activity.
        </p>
        <input
          className="input"
          placeholder="Optional note"
          value={grantNote}
          onChange={(e) => setGrantNote(e.target.value)}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex gap-2">
            <input
              className="input"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Points"
              value={pointsToAdd}
              onChange={(e) => setPointsToAdd(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={granting !== null}
              onClick={grantPoints}
            >
              {granting === "points" ? "Adding…" : "Add points"}
            </button>
          </div>
          <div className="flex gap-2">
            <input
              className="input"
              type="number"
              min={1}
              inputMode="numeric"
              placeholder="Stamps"
              value={stampsToAdd}
              onChange={(e) => setStampsToAdd(e.target.value)}
            />
            <button
              type="button"
              className="btn btn-primary shrink-0"
              disabled={granting !== null}
              onClick={grantStamps}
            >
              {granting === "stamps" ? "Adding…" : "Add stamps"}
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {(["orders", "activity"] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={clsx(
              "rounded-full px-4 py-2 text-sm font-semibold capitalize",
              tab === key
                ? "bg-[var(--ink)] text-white"
                : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]",
            )}
          >
            {key === "orders" ? "Orders" : "Activity"}
          </button>
        ))}
      </div>

      {tab === "orders" ? (
        <div className="space-y-4">
          <div className="max-w-xl">
            <AdminSearchBar
              value={list.query}
              onChange={list.setQuery}
              placeholder="Search by order number…"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {(["ALL", ...STATUSES] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setFilter(s);
                  list.setPage(1);
                }}
                className={clsx(
                  "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-wide",
                  filter === s
                    ? "bg-[var(--ink)] text-white"
                    : "bg-white text-[var(--muted)] ring-1 ring-[var(--line)]",
                )}
              >
                {s === "ALL" ? "All" : s}{" "}
                <span className="opacity-70">{counts[s] ?? 0}</span>
              </button>
            ))}
          </div>

          {list.pageItems.length === 0 ? (
            <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
              No orders for this member.
            </div>
          ) : (
            <div className="space-y-2">
              {list.pageItems.map((order) => {
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
                      <div>
                        <div className="font-semibold">{order.orderNumber}</div>
                        <div className="mt-0.5 text-sm text-[var(--muted)]">
                          Table {order.table?.name || "—"} ·{" "}
                          {formatWhen(order.createdAt)}
                        </div>
                        {order.pointsRedeemed > 0 ? (
                          <div className="mt-1 text-[11px] font-bold text-sky-800">
                            {order.pointsRedeemed} pts applied · −
                            {money(Number(order.pointsDiscountNzd))}
                          </div>
                        ) : null}
                        {order.stampRedeemed ? (
                          <div className="mt-1 text-[11px] font-bold text-emerald-800">
                            Stamp applied
                            {order.stampMenu?.name
                              ? `: 1× ${order.stampMenu.name}`
                              : ""}
                          </div>
                        ) : null}
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
                      <ul className="space-y-2 border-t border-[var(--line)] px-4 py-3 text-sm">
                        {order.items.map((item) => (
                          <li
                            key={item.id}
                            className="flex justify-between gap-3"
                          >
                            <span>
                              {item.quantity}× {itemLabel(item)}
                            </span>
                            <span className="font-semibold tabular-nums">
                              {money(Number(item.salePrice) * item.quantity)}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                );
              })}
              <AdminPagination
                page={list.page}
                totalPages={list.totalPages}
                total={list.total}
                onPageChange={list.setPage}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {user.ledger.length === 0 ? (
            <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
              No reward activity yet.
            </div>
          ) : (
            user.ledger.map((row) => (
              <div
                key={row.id}
                className="surface-card flex items-start justify-between gap-3 rounded-2xl p-4 text-sm"
              >
                <div>
                  <div className="font-semibold">
                    {row.note || row.type.replaceAll("_", " ")}
                  </div>
                  <div className="text-xs text-[var(--muted)]">
                    {formatWhen(row.createdAt)}
                  </div>
                </div>
                <div className="shrink-0 text-right font-bold tabular-nums">
                  {row.pointsDelta
                    ? `${row.pointsDelta > 0 ? "+" : ""}${row.pointsDelta} pts`
                    : null}
                  {row.pointsDelta && row.stampsDelta ? " · " : null}
                  {row.stampsDelta
                    ? `${row.stampsDelta > 0 ? "+" : ""}${row.stampsDelta} stamps`
                    : null}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-card rounded-2xl px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </div>
      <div className="mt-1 font-bold">{value}</div>
    </div>
  );
}
