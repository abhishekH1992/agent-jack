"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { money } from "@/lib/cart";
import { CLERK_ENABLED } from "@/lib/config";
import { useClerkGql } from "@/lib/clerk-headers";
import { gql } from "@/lib/graphql";
import { ORDER_BY_ID_QUERY, REWARD_SETTINGS_QUERY } from "@/lib/queries";

type OrderEarn = {
  id: string;
  pointsEarned: number;
  stampsEarned: number;
  pointsRedeemed: number;
  pointsDiscountNzd: number;
  stampRedeemed: boolean;
  stampMenu?: { id: string; name: string } | null;
};

export function SuccessRewards({ orderId }: { orderId?: string }) {
  if (!CLERK_ENABLED) return <GuestHint />;
  return (
    <>
      <SignedOut>
        <GuestHint />
      </SignedOut>
      <SignedIn>
        <EarnedCopy orderId={orderId} />
      </SignedIn>
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

function EarnedCopy({ orderId }: { orderId?: string }) {
  const { isSignedIn } = useAuth();
  const clerkGql = useClerkGql();
  const [order, setOrder] = useState<OrderEarn | null>(null);

  useEffect(() => {
    if (!orderId || !isSignedIn) return;
    let cancelled = false;
    let attempts = 0;
    async function load() {
      try {
        const data = await clerkGql<{ order: OrderEarn | null }>(
          ORDER_BY_ID_QUERY,
          { id: orderId },
        );
        if (cancelled) return;
        setOrder(data.order);
        if (
          data.order &&
          data.order.pointsEarned === 0 &&
          data.order.stampsEarned === 0 &&
          attempts < 6
        ) {
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
  }, [orderId, isSignedIn, clerkGql]);

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
    <div className="mt-4 space-y-3">
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
