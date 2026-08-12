"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth, useUser } from "@clerk/nextjs";
import { Button, Card } from "@heroui/react";
import toast from "react-hot-toast";
import {
  cartTotal,
  clearCartId,
  getTableId,
  money,
  setTableId,
} from "@/lib/cart";
import { CLERK_ENABLED } from "@/lib/config";
import { clerkAuthHeaders } from "@/lib/clerk-headers";
import { gql } from "@/lib/graphql";
import {
  CHECKOUT,
  MY_REWARDS_QUERY,
  REWARD_SETTINGS_QUERY,
  TABLES_QUERY,
  UPDATE_CART,
} from "@/lib/queries";
import { useCart } from "@/components/cart/CartProvider";
import { CheckoutAuth } from "@/components/checkout/CheckoutAuth";

type RedeemOn = "FOOD" | "LIQUOR" | "BOTH";

type RewardPreview = {
  qualifyingSubtotal: number;
  maxDiscountNzd: number;
  pointsToSpend: number;
  canRedeemStamp: boolean;
  stampDiscountNzd: number;
  stampMenusInCart: { id: string; name: string }[];
};

type MyRewards = {
  pointsBalance: number;
  stampsBalance: number;
  settings: {
    enabled: boolean;
    pointsPerDollar: number;
    pointsToRedeem: number;
    rewardAmountNzd: number;
    redeemOn: RedeemOn;
    stampsEnabled: boolean;
    stampsRequired: number;
  };
  preview: RewardPreview | null;
};

function redeemLabel(on: RedeemOn) {
  if (on === "FOOD") return "food";
  if (on === "LIQUOR") return "liquor";
  return "food and liquor";
}

export function CheckoutForm() {
  if (CLERK_ENABLED) return <CheckoutFormAuthed />;
  return <CheckoutFormBase authHeaders={{}} signedIn={false} />;
}

function CheckoutFormAuthed() {
  const { isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const headers =
    isSignedIn && userId
      ? clerkAuthHeaders({
          userId,
          email: user?.primaryEmailAddress?.emailAddress,
          name: user?.fullName,
        })
      : {};
  return (
    <CheckoutFormBase authHeaders={headers} signedIn={Boolean(isSignedIn)} />
  );
}

function CheckoutFormBase({
  authHeaders,
  signedIn,
}: {
  authHeaders: Record<string, string>;
  signedIn: boolean;
}) {
  const { cart, refresh } = useCart();
  const [tables, setTables] = useState<{ id: string; name: string }[]>([]);
  const [tableId, setTable] = useState(getTableId() || "");
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [rewardsOn, setRewardsOn] = useState(false);
  const [myRewards, setMyRewards] = useState<MyRewards | null>(null);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [redeemStampMenuId, setRedeemStampMenuId] = useState("");

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

  useEffect(() => {
    gql<{ rewardSettings: { enabled: boolean } }>(REWARD_SETTINGS_QUERY)
      .then((data) => setRewardsOn(data.rewardSettings.enabled))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!signedIn || !cart?.id) {
      setMyRewards(null);
      return;
    }
    gql<{ myRewards: MyRewards }>(
      MY_REWARDS_QUERY,
      { cartId: cart.id },
      authHeaders,
    )
      .then((data) => setMyRewards(data.myRewards))
      .catch(() => undefined);
  }, [signedIn, cart?.id]);

  async function pay() {
    if (!cart?.id) return toast.error("Cart missing");
    if (!tableId) return toast.error("Select a table");
    if (!guestName || !guestEmail) return toast.error("Name and email required");

    setBusy(true);
    try {
      setTableId(tableId);
      await gql(UPDATE_CART, { id: cart.id, tableId }, authHeaders);
      const origin = window.location.origin;
      const data = await gql<{
        createCheckoutSession: { url: string | null; orderId: string };
      }>(
        CHECKOUT,
        {
          cartId: cart.id,
          tableId,
          guestName,
          guestEmail,
          successUrl: `${origin}/success?session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: `${origin}/checkout`,
          redeemPoints: signedIn && redeemPoints ? true : false,
          redeemStampMenuId:
            signedIn && redeemStampMenuId && myRewards?.preview?.canRedeemStamp
              ? redeemStampMenuId
              : null,
        },
        authHeaders,
      );

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
  const preview = myRewards?.preview;
  const discount =
    redeemPoints && preview?.maxDiscountNzd ? preview.maxDiscountNzd : 0;
  const stampDiscount =
    redeemStampMenuId && preview?.canRedeemStamp
      ? preview.stampDiscountNzd || 0
      : 0;
  const stampItem = preview?.stampMenusInCart.find(
    (m) => m.id === redeemStampMenuId,
  );
  const settings = myRewards?.settings;
  const displayTotal = Math.max(0, total - discount - stampDiscount);

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

        {rewardsOn && !signedIn ? (
          <Card className="surface-card border-none p-4 sm:p-5">
            <h2 className="mb-2 font-bold">Rewards</h2>
            <p className="text-sm text-[var(--muted)]">
              Sign in to earn and redeem points and stamps. Guest checkout does
              not earn rewards.
            </p>
          </Card>
        ) : null}

        {signedIn && settings?.enabled ? (
          <Card className="surface-card border-none p-4 sm:p-5">
            <h2 className="mb-2 font-bold">Rewards</h2>
            <p className="mb-3 text-sm text-[var(--muted)]">
              {myRewards?.pointsBalance || 0} points ·{" "}
              {myRewards?.stampsBalance || 0} stamps. Applies to{" "}
              {redeemLabel(settings.redeemOn)}.
            </p>
            {preview && preview.pointsToSpend > 0 ? (
              <label className="mb-3 flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.checked)}
                />
                <span>
                  Redeem {preview.pointsToSpend} points for{" "}
                  {money(preview.maxDiscountNzd)} off
                </span>
              </label>
            ) : (
              <p className="mb-3 text-sm text-[var(--muted)]">
                {settings.pointsToRedeem} points ={" "}
                {money(settings.rewardAmountNzd)} off.
              </p>
            )}
            {preview?.canRedeemStamp ? (
              <div className="space-y-2">
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={Boolean(redeemStampMenuId)}
                    onChange={(e) =>
                      setRedeemStampMenuId(
                        e.target.checked
                          ? preview.stampMenusInCart[0]?.id || ""
                          : "",
                      )
                    }
                  />
                  <span>
                    Use {settings.stampsRequired} stamps — 1 free{" "}
                    {stampItem?.name || "item"}
                  </span>
                </label>
                {preview.stampMenusInCart.length > 1 && redeemStampMenuId ? (
                  <select
                    className="input"
                    value={redeemStampMenuId}
                    onChange={(e) => setRedeemStampMenuId(e.target.value)}
                  >
                    {preview.stampMenusInCart.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
            ) : null}
            <Link
              href="/rewards"
              className="mt-3 inline-flex text-sm font-semibold"
            >
              View rewards
            </Link>
          </Card>
        ) : null}
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
        {discount > 0 ? (
          <div className="mt-3 flex justify-between text-sm text-[var(--muted)]">
            <span>Points</span>
            <span>−{money(discount)}</span>
          </div>
        ) : null}
        {stampDiscount > 0 ? (
          <div className="mt-2 flex justify-between text-sm text-[var(--muted)]">
            <span>Stamp</span>
            <span>−{money(stampDiscount)}</span>
          </div>
        ) : null}
        <div className="mt-4 flex justify-between border-t border-[var(--line)] pt-4 text-lg">
          <span>Total</span>
          <span className="font-extrabold">{money(displayTotal)}</span>
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
