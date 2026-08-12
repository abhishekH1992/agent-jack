"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { ORDER_QUERY, UPDATE_ORDER_STATUS } from "@/lib/queries";
import {
  OrderDetail,
  PrintTicket,
  type Order,
} from "@/components/admin/OrderDetail";

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const data = await adminGql<{ order: Order | null }>(ORDER_QUERY, { id });
    setOrder(data.order);
  }, [id]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    load()
      .catch((err) => toast.error(err.message || "Could not load order"))
      .finally(() => setLoading(false));
  }, [id, load]);

  async function setStatus(status: string) {
    if (!order) return;
    try {
      await adminGql(UPDATE_ORDER_STATUS, { id: order.id, status });
      await load();
      toast.success(`Marked ${status.toLowerCase()}`);
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  function printTicket() {
    window.print();
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading order…</div>;
  }

  if (!order) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Order not found.</p>
        <Link href="/admin/orders" className="btn btn-secondary !rounded-xl">
          Back to orders
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="no-print">
        <Link
          href="/admin/orders"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Orders
        </Link>
      </div>

      <section className="no-print surface-card rounded-2xl p-4 md:p-6">
        <OrderDetail
          order={order}
          onStatus={setStatus}
          onPrint={printTicket}
          onApplied={load}
        />
      </section>

      <div className="print-ticket hidden">
        <PrintTicket order={order} />
      </div>
    </div>
  );
}
