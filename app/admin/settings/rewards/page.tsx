"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  REWARD_SETTINGS_QUERY,
  UPDATE_REWARD_SETTINGS,
} from "@/lib/queries";

type RedeemOn = "FOOD" | "LIQUOR" | "BOTH";

type StampMenu = { id: string; menu: { id: string; name: string } };

type RewardSettings = {
  id: string;
  enabled: boolean;
  pointsPerDollar: number;
  pointsToRedeem: number;
  rewardAmountNzd: number;
  redeemOn: RedeemOn;
  stampsEnabled: boolean;
  stampsRequired: number;
  stampMenus: StampMenu[];
};

type CatalogMenu = {
  id: string;
  name: string;
  isEnable: boolean;
};

type CatalogSub = {
  id: string;
  name: string;
  menus: CatalogMenu[];
};

type CatalogCat = {
  id: string;
  name: string;
  categoryType?: { name: string } | null;
  subCategories: CatalogSub[];
};

export default function AdminRewardsPage() {
  const [enabled, setEnabled] = useState(true);
  const [pointsPerDollar, setPointsPerDollar] = useState("1");
  const [pointsToRedeem, setPointsToRedeem] = useState("100");
  const [rewardAmountNzd, setRewardAmountNzd] = useState("5");
  const [redeemOn, setRedeemOn] = useState<RedeemOn>("BOTH");
  const [stampsEnabled, setStampsEnabled] = useState(true);
  const [stampsRequired, setStampsRequired] = useState("9");
  const [stampMenuIds, setStampMenuIds] = useState<string[]>([]);
  const [categories, setCategories] = useState<CatalogCat[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      adminGql<{ rewardSettings: RewardSettings }>(REWARD_SETTINGS_QUERY),
      adminGql<{ categories: CatalogCat[] }>(ADMIN_CATALOG_QUERY),
    ])
      .then(([rewards, catalog]) => {
        const s = rewards.rewardSettings;
        setEnabled(s.enabled);
        setPointsPerDollar(String(s.pointsPerDollar));
        setPointsToRedeem(String(s.pointsToRedeem));
        setRewardAmountNzd(String(s.rewardAmountNzd));
        setRedeemOn(s.redeemOn);
        setStampsEnabled(s.stampsEnabled);
        setStampsRequired(String(s.stampsRequired));
        setStampMenuIds(s.stampMenus.map((row) => row.menu.id));
        setCategories(catalog.categories || []);
      })
      .catch((err) => {
        console.error(err);
        toast.error(err.message || "Could not load rewards");
      })
      .finally(() => setLoading(false));
  }, []);

  const grouped = useMemo(() => {
    return categories.map((cat) => ({
      id: cat.id,
      label: `${cat.name}${cat.categoryType?.name ? ` · ${cat.categoryType.name}` : ""}`,
      menus: cat.subCategories.flatMap((sub) =>
        (sub.menus || [])
          .filter((m) => m.isEnable !== false)
          .map((m) => ({ id: m.id, name: `${sub.name} — ${m.name}` })),
      ),
    }));
  }, [categories]);

  function toggleMenu(id: string) {
    setStampMenuIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id],
    );
  }

  async function save() {
    setSaving(true);
    try {
      await adminGql(UPDATE_REWARD_SETTINGS, {
        input: {
          enabled,
          pointsPerDollar: Number(pointsPerDollar),
          pointsToRedeem: Number(pointsToRedeem),
          rewardAmountNzd: Number(rewardAmountNzd),
          redeemOn,
          stampsEnabled,
          stampsRequired: Number(stampsRequired),
          stampMenuIds,
        },
      });
      toast.success("Rewards saved");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl text-sm text-[var(--muted)]">
        Loading rewards…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Rewards
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Logged-in members only. Guests do not earn or redeem.
        </p>
      </div>

      <div className="surface-card space-y-4 rounded-2xl p-5">
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold">Enable rewards</span>
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
        </label>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            $1 spent = how many points
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.01"
            value={pointsPerDollar}
            onChange={(e) => setPointsPerDollar(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Points needed to redeem
          </label>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={pointsToRedeem}
            onChange={(e) => setPointsToRedeem(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Reward value ($ off)
          </label>
          <input
            className="input"
            type="number"
            min="0"
            step="0.5"
            value={rewardAmountNzd}
            onChange={(e) => setRewardAmountNzd(e.target.value)}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-semibold">
            Points apply to
          </label>
          <select
            className="input"
            value={redeemOn}
            onChange={(e) => setRedeemOn(e.target.value as RedeemOn)}
          >
            <option value="BOTH">Food and liquor</option>
            <option value="FOOD">Food only</option>
            <option value="LIQUOR">Liquor only</option>
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Earn and redeem use the same setting. Liquor bids follow this too.
          </p>
        </div>
      </div>

      <div className="surface-card space-y-4 rounded-2xl p-5">
        <label className="flex items-center justify-between gap-3">
          <span className="font-semibold">Stamp card</span>
          <input
            type="checkbox"
            checked={stampsEnabled}
            onChange={(e) => setStampsEnabled(e.target.checked)}
          />
        </label>
        <div>
          <label className="mb-1 block text-sm font-semibold">
            Stamps for 1 free item
          </label>
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={stampsRequired}
            onChange={(e) => setStampsRequired(e.target.value)}
          />
        </div>
        <div>
          <p className="mb-2 text-sm font-semibold">Stamp card items</p>
          <div className="max-h-72 space-y-3 overflow-y-auto rounded-xl border border-[var(--line)] p-3">
            {grouped.map((group) =>
              group.menus.length ? (
                <div key={group.id}>
                  <div className="mb-1 text-xs font-bold uppercase tracking-wider text-[var(--muted)]">
                    {group.label}
                  </div>
                  <div className="space-y-1">
                    {group.menus.map((menu) => (
                      <label
                        key={menu.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="checkbox"
                          checked={stampMenuIds.includes(menu.id)}
                          onChange={() => toggleMenu(menu.id)}
                        />
                        <span>{menu.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : null,
            )}
          </div>
        </div>
      </div>

      <button
        className="btn btn-primary w-full"
        disabled={saving}
        onClick={save}
      >
        {saving ? "Saving…" : "Save rewards"}
      </button>
    </div>
  );
}
