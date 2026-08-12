"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { adminGql } from "@/lib/admin";
import { ORDERS_QUERY, UPDATE_ORDER_STATUS } from "@/lib/queries";

const statuses = ["PENDING", "PAID", "FULFILLED", "CANCELLED"];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);

  async function load() {
    const data = await adminGql<{ orders: any[] }>(ORDERS_QUERY);
    setOrders(data.orders);
  }

  useEffect(() => {
    load().catch(console.error);
  }, []);

  async function setStatus(id: string, status: string) {
    try {
      await adminGql(UPDATE_ORDER_STATUS, { id, status });
      await load();
      toast.success("Updated");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Orders
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Track table orders across mobile and desktop.
        </p>
      </div>

      <div className="space-y-3 md:hidden">
        {orders.map((order) => (
          <div key={order.id} className="surface-card rounded-2xl p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{order.orderNumber}</div>
                <div className="text-sm text-[var(--muted)]">
                  Table {order.table?.name || "—"} · {order.guestName || "Guest"}
                </div>
              </div>
              <div className="text-[var(--ink)] font-bold">
                {money(Number(order.totalAmount))}
              </div>
            </div>
            <select
              className="input mt-3"
              value={order.status}
              onChange={(e) => setStatus(order.id, e.target.value)}
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      <div className="surface-card hidden overflow-x-auto rounded-2xl md:block">
        <table className="min-w-full text-left text-sm">
          <thead className="text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Table</th>
              <th className="px-4 py-3">Guest</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-t border-[var(--line)]">
                <td className="px-4 py-3">{order.orderNumber}</td>
                <td className="px-4 py-3">{order.table?.name || "—"}</td>
                <td className="px-4 py-3">{order.guestName || "Guest"}</td>
                <td className="px-4 py-3">{money(Number(order.totalAmount))}</td>
                <td className="px-4 py-3">
                  <select
                    className="input !py-2"
                    value={order.status}
                    onChange={(e) => setStatus(order.id, e.target.value)}
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
