"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { money } from "@/lib/cart";
import { CLERK_ENABLED } from "@/lib/config";
import { useClerkGql } from "@/lib/clerk-headers";
import { gql } from "@/lib/graphql";
import { CONFIRM_CHECKOUT, REWARD_SETTINGS_QUERY } from "@/lib/queries";

type OrderEarn = {
  id: string;
  orderNumber: string;
  pointsEarned: number;
  stampsEarned: number;
  pointsRedeemed: number;
  pointsDiscountNzd: number;
  stampRedeemed: boolean;
  stampMenu?: { id: string; name: string } | null;
  table?: { id: string; name: string } | null;
};

export function SuccessRewards({
  orderId,
  sessionId,
}: {
  orderId?: string;
  sessionId?: string;
}) {
  if (!CLERK_ENABLED) {
    return (
      <>
        <ConfirmPaid orderId={orderId} sessionId={sessionId} authed={false} />
        <GuestHint />
      </>
    );
  }
  return (
    <>
      <ConfirmPaidAuthed orderId={orderId} sessionId={sessionId} />
      <SignedOut>
        <GuestHint />
      </SignedOut>
    </>
  );
}

function GuestHint() {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    gql<{ rewardSettings: { enabled: boolean } }>(REWARD_SETTINGS_QUERY)
      .then((d) => setEnabled(d.rewardSettings.enabled))
      .catch(() => undefined);
  }, []);
  if (!enabled) return null;
  return (
    <p className="mt-4 text-sm text-[var(--muted)]">
      Sign in next time to earn points and stamps.{" "}
      {CLERK_ENABLED ? (
        <SignInButton mode="modal">
          <button type="button" className="font-semibold text-[var(--ink)]">
            Sign in
          </button>
        </SignInButton>
      ) : null}
    </p>
  );
}

function ConfirmPaidAuthed({
  orderId,
  sessionId,
}: {
  orderId?: string;
  sessionId?: string;
}) {
  const clerkGql = useClerkGql();
  return (
    <ConfirmPaid
      orderId={orderId}
      sessionId={sessionId}
      authed
      request={clerkGql}
    />
  );
}

function ConfirmPaid({
  orderId,
  sessionId,
  authed,
  request = gql,
}: {
  orderId?: string;
  sessionId?: string;
  authed: boolean;
  request?: typeof gql;
}) {
  const [order, setOrder] = useState<OrderEarn | null>(null);

  useEffect(() => {
    if (!orderId && !sessionId) return;
    let cancelled = false;
    let attempts = 0;
    async function load() {
      try {
        const data = await request<{ confirmCheckout: OrderEarn }>(
          CONFIRM_CHECKOUT,
          { orderId: orderId || null, sessionId: sessionId || null },
        );
        if (cancelled) return;
        setOrder(data.confirmCheckout);
        const earned =
          data.confirmCheckout.pointsEarned > 0 ||
          data.confirmCheckout.stampsEarned > 0;
        if (!earned && attempts < 6) {
          attempts += 1;
          window.setTimeout(load, 1500);
        }
      } catch {
        if (!cancelled && attempts < 4) {
          attempts += 1;
          window.setTimeout(load, 1500);
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [orderId, sessionId, request]);

  return (
    <div className="mt-4 space-y-3">
      {order ? (
        <>
          <div className="rounded-2xl bg-[var(--brand-soft)] px-4 py-3">
            <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]">
              Order number
            </div>
            <div className="font-display text-2xl font-bold tracking-wide">
              {order.orderNumber}
            </div>
            {order.table?.name ? (
              <div className="mt-1 text-sm text-[var(--muted)]">
                Table {order.table.name}
              </div>
            ) : null}
          </div>
          <Link
            href={`/orders/${order.id}`}
            className="inline-flex min-h-12 w-full items-center justify-center rounded-full border-2 border-[var(--brand)] px-6 text-sm font-semibold text-[var(--brand)]"
          >
            View your order
          </Link>
        </>
      ) : orderId || sessionId ? (
        <p className="text-sm text-[var(--muted)]">Confirming your order…</p>
      ) : null}
      {authed ? <EarnedCopy order={order} /> : null}
    </div>
  );
}

function EarnedCopy({ order }: { order: OrderEarn | null }) {
  const { isSignedIn } = useAuth();
  if (!isSignedIn) return null;

  const bits: string[] = [];
  if (order?.pointsEarned) bits.push(`${order.pointsEarned} points`);
  if (order?.stampsEarned) {
    bits.push(
      `${order.stampsEarned} stamp${order.stampsEarned === 1 ? "" : "s"}`,
    );
  }

  const applied: string[] = [];
  if (order?.pointsRedeemed) {
    applied.push(
      `${order.pointsRedeemed} points (−${money(Number(order.pointsDiscountNzd))})`,
    );
  }
  if (order?.stampRedeemed) {
    applied.push(
      order.stampMenu?.name
        ? `1 free ${order.stampMenu.name}`
        : "1 free stamp",
    );
  }

  return (
    <div className="space-y-3">
      {applied.length ? (
        <p className="text-sm font-semibold">
          Rewards applied: {applied.join(" · ")}
        </p>
      ) : null}
      {bits.length ? (
        <p className="text-sm font-semibold">You earned {bits.join(" and ")}.</p>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          Rewards will land once payment confirms.
        </p>
      )}
      <Link
        href="/rewards"
        className="inline-flex min-h-11 items-center justify-center text-sm font-semibold text-[var(--ink)]"
      >
        View rewards
      </Link>
    </div>
  );
}
