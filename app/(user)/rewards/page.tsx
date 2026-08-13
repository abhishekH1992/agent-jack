"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { SignedIn, SignedOut, SignInButton } from "@clerk/nextjs";
import toast from "react-hot-toast";
import { money } from "@/lib/cart";
import { CLERK_ENABLED } from "@/lib/config";
import { useClerkGql } from "@/lib/clerk-headers";
import { MY_REWARDS_QUERY } from "@/lib/queries";

type RedeemOn = "FOOD" | "LIQUOR" | "BOTH";

type Settings = {
  enabled: boolean;
  pointsPerDollar: number;
  pointsToRedeem: number;
  rewardAmountNzd: number;
  redeemOn: RedeemOn;
  stampsEnabled: boolean;
  stampsRequired: number;
  stampMenus: { id: string; menu: { id: string; name: string } }[];
};

type Ledger = {
  id: string;
  type: string;
  pointsDelta: number;
  stampsDelta: number;
  note?: string | null;
  createdAt: string;
};

type MyRewards = {
  pointsBalance: number;
  stampsBalance: number;
  settings: Settings;
  ledger: Ledger[];
};

function redeemLabel(on: RedeemOn) {
  if (on === "FOOD") return "food";
  if (on === "LIQUOR") return "liquor";
  return "food and liquor";
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function RewardsPage() {
  if (!CLERK_ENABLED) {
    return (
      <div className="page-shell space-y-4 py-8 pb-32">
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Rewards
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Sign-in is not configured, so rewards are unavailable.
        </p>
      </div>
    );
  }

  return (
    <>
      <SignedOut>
        <div className="page-shell space-y-4 py-8 pb-32">
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Rewards
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sign in to earn points and stamps. Guests do not earn rewards.
          </p>
          <SignInButton mode="modal">
            <button type="button" className="btn btn-primary !rounded-xl">
              Sign in
            </button>
          </SignInButton>
        </div>
      </SignedOut>
      <SignedIn>
        <RewardsHome />
      </SignedIn>
    </>
  );
}

function RewardsHome() {
  const clerkGql = useClerkGql();
  const [data, setData] = useState<MyRewards | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    clerkGql<{ myRewards: MyRewards }>(MY_REWARDS_QUERY)
      .then((res) => {
        if (!cancelled) setData(res.myRewards);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error(err);
        toast.error(err?.message || "Could not load rewards");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [clerkGql]);

  if (loading || !data) {
    return (
      <div className="page-shell py-8 pb-32 text-sm text-[var(--muted)]">
        Loading rewards…
      </div>
    );
  }

  const { settings, pointsBalance, stampsBalance, ledger } = data;
  const needed = Math.max(1, settings.pointsToRedeem);
  const toward = pointsBalance % needed;
  const progress = Math.min(100, Math.round((toward / needed) * 100));
  const stampNeed = Math.max(1, settings.stampsRequired);
  const stampFilled = Math.min(stampNeed, stampsBalance % stampNeed);
  const freeCards = Math.floor(stampsBalance / stampNeed);

  return (
    <div className="page-shell space-y-5 py-8 pb-32">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Rewards
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Members only. {settings.pointsPerDollar} point
          {settings.pointsPerDollar === 1 ? "" : "s"} per $1 on{" "}
          {redeemLabel(settings.redeemOn)}. {needed} points ={" "}
          {money(settings.rewardAmountNzd)} off. Guests do not earn.
        </p>
      </div>

      {!settings.enabled ? (
        <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
          Rewards are paused right now.
        </div>
      ) : (
        <>
          <div className="surface-card space-y-3 rounded-2xl p-5">
            <div className="flex items-end justify-between gap-3">
              <div>
                <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                  Points
                </div>
                <div className="font-display text-4xl font-bold">
                  {pointsBalance}
                </div>
              </div>
              <div className="text-right text-sm text-[var(--muted)]">
                {needed - toward} to next {money(settings.rewardAmountNzd)} off
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--brand-soft)]">
              <div
                className="h-full rounded-full bg-[var(--brand)]"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {settings.stampsEnabled ? (
            <div className="surface-card space-y-3 rounded-2xl p-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    Stamp card
                  </div>
                  <div className="text-sm text-[var(--muted)]">
                    {stampNeed} stamps = 1 free{" "}
                    {settings.stampMenus.map((s) => s.menu.name).join(", ") ||
                      "selected item"}
                  </div>
                </div>
                {freeCards > 0 ? (
                  <div className="text-sm font-bold">
                    {freeCards} free ready
                  </div>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: stampNeed }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold"
                    style={{
                      borderColor: "var(--brand)",
                      background:
                        i < stampFilled ? "var(--brand)" : "transparent",
                      color: i < stampFilled ? "white" : "var(--ink)",
                    }}
                  >
                    {i + 1}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      <div className="flex flex-wrap gap-3">
        <Link href="/menu" className="btn btn-primary !rounded-xl">
          Browse menu
        </Link>
        <Link href="/orders" className="btn btn-secondary !rounded-xl">
          Your orders
        </Link>
      </div>

      <div>
        <h2 className="mb-3 font-bold">Activity</h2>
        {ledger.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Pay while signed in to start earning.
          </p>
        ) : (
          <ul className="space-y-2">
            {ledger.map((row) => (
              <li
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
