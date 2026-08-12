"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card } from "@heroui/react";
import toast from "react-hot-toast";
import {
  cartTotal,
  clearCartId,
  getTableId,
  money,
  setTableId,
} from "@/lib/cart";
import { gql } from "@/lib/graphql";
import { CHECKOUT, TABLES_QUERY, UPDATE_CART } from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutAuth } from "@/components/checkout/CheckoutAuth";

export function CheckoutForm() {
  const { cart, refresh } = useCart();
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [tableId, setTable] = useState(getTableId() || "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    gql<{ tables: { id: string; name: string; isActive: boolean }[] }>(
      TABLES_QUERY,
    )
      .then((data) => {
        const active = data.tables.filter((t) => t.isActive);
        setTables(active);
        setTable((current) => current || active[0]?.id || "");
      })
      .catch(() => undefined);
  }, []);

  async function pay() {
    if (!cart?.id) return toast.error("Cart missing");
    if (!tableId) return toast.error("Select a table");
    if (!guestName || !guestEmail) return toast.error("Name and email required");

    setBusy(true);
    try {
      setTableId(tableId);
      await gql(UPDATE_CART, { id: cart.id, tableId });
      const origin = window.location.origin;
      const data = await gql<{
        createCheckoutSession: { url: string | null; orderId: string };
      }>(CHECKOUT, {
        cartId: cart.id,
        tableId,
        guestName,
        guestEmail,
        successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${origin}/checkout`,
      });

      if (!data.createCheckoutSession.url) {
        toast.error(
          "Stripe is not configured. Set STRIPE_SECRET_KEY for hosted checkout.",
        );
        return;
      }
      clearCartId();
      window.location.href = data.createCheckoutSession.url;
    } catch (err: any) {
      toast.error(err.message || "Checkout failed");
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const items = cart?.items || [];
  const total = cartTotal(items);

  return (
    <div className="grid gap-4 pb-32 sm:gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <Card className="surface-card border-none p-4 sm:p-5">
          <h2 className="mb-2 font-bold">Table</h2>
          <p className="mb-3 text-sm text-[var(--muted)]">
            Prefills from your QR scan — change it if you moved.
          </p>
          <select
            className="input"
            value={tableId}
            onChange={(e) => setTable(e.target.value)}
          >
            <option value="">Select table</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </Card>

        <Card className="surface-card border-none p-4 sm:p-5">
          <CheckoutAuth
            guestName={guestName}
            guestEmail={guestEmail}
            setGuestName={setGuestName}
            setGuestEmail={setGuestEmail}
          />
        </Card>
      </div>

      <Card className="surface-card h-fit border-none p-4 sm:p-5">
        <h2 className="mb-4 font-bold">Order summary</h2>
        <div className="space-y-2 text-sm">
          {items.map((item) => (
            <div key={item.id} className="flex justify-between gap-3">
              <span>
                {item.combo?.name || item.menu?.name} × {item.quantity}
              </span>
              <span>{money(Number(item.salePrice) * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-lg">
          <span>Total</span>
          <span className="font-extrabold">{money(total)}</span>
        </div>
        <Button
          className="mt-5 min-h-12 w-full bg-[var(--brand)] font-bold text-white"
          isDisabled={busy || items.length === 0}
          onPress={pay}
        >
          {busy ? "Redirecting…" : "Pay with Stripe"}
        </Button>
        <p className="mt-3 text-xs text-[var(--muted)]">
          Hosted Stripe Checkout supports cards, Apple Pay, and Google Pay when
          enabled in your Stripe Dashboard.
        </p>
        <Link
          href="/cart"
          className="mt-3 flex min-h-11 cursor-pointer items-center justify-center text-sm font-semibold text-[var(--muted)]"
        >
          Back to cart
        </Link>
      </Card>
    </div>
  );
}
