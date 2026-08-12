"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import { API_URL } from "@/lib/config";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { LIQUOR_MENUS, ORDERS_QUERY } from "@/lib/queries";

export default function AdminDashboard() {
  const [menus, setMenus] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  async function load() {
    const [m, o] = await Promise.all([
      adminGql<{ menus: any[] }>(LIQUOR_MENUS),
      adminGql<{ orders: any[] }>(ORDERS_QUERY),
    ]);
    setMenus(m.menus);
    setOrders(o.orders.slice(0, 8));
  }

  useEffect(() => {
    load().catch(console.error);
    const socket = io(API_URL, { transports: ["websocket", "polling"] });
    socket.on("price:update", (payload: { menuId: string; currentPrice: number }) => {
      setMenus((prev) =>
        prev.map((menu) =>
          menu.id === payload.menuId
            ? { ...menu, currentPrice: payload.currentPrice }
            : menu,
        ),
      );
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Dashboard
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Live liquor prices and recent table orders.
        </p>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {menus.map((menu) => (
          <div key={menu.id} className="surface-card rounded-2xl p-4">
            <div className="text-sm text-[var(--muted)]">{menu.name}</div>
            <div className="mt-1 text-2xl text-[var(--ink)] font-bold">
              {money(Number(menu.currentPrice ?? menu.fixedPrice))}
            </div>
            <div className="mt-2 text-xs text-[var(--muted)]">
              Range {money(Number(menu.lowestPrice))} –{" "}
              {money(Number(menu.highestPrice))}
            </div>
          </div>
        ))}
      </section>

      <section className="surface-card overflow-x-auto rounded-2xl">
        <div className="border-b border-[var(--line)] px-4 py-3 font-semibold">
          Recent orders
        </div>
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.table?.name || "—"}</td>
                <td className="px-4 py-3">{order.status}</td>
                <td className="px-4 py-3">{money(Number(order.totalAmount))}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr>
                <td className="px-4 py-6 text-[var(--muted)]" colSpan={4}>
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
