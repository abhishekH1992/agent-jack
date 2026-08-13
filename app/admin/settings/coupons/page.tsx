"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  COUPONS_QUERY,
  DELETE_COUPON,
  STORE_COUPON,
  UPDATE_COUPON,
} from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type RedeemOn = "FOOD" | "LIQUOR" | "BOTH";

type Coupon = {
  id: string;
  code: string;
  percentOff: number;
  minSpendNzd: number;
  maxDiscountNzd: number | null;
  startsAt: string | null;
  expiresAt: string | null;
  allowWithRewards: boolean;
  applyOn: RedeemOn;
  isActive: boolean;
};

const emptyForm = {
  code: "",
  percentOff: "10",
  minSpendNzd: "0",
  maxDiscountNzd: "",
  startsAt: "",
  expiresAt: "",
  allowWithRewards: false,
  applyOn: "BOTH" as RedeemOn,
  isActive: true,
};

function toDateInput(iso: string | null) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function applyOnLabel(applyOn: RedeemOn) {
  if (applyOn === "FOOD") return "Food only";
  if (applyOn === "LIQUOR") return "Liquor only";
  return "Food and liquor";
}

function dateInputToIso(day: string, endOfDay: boolean) {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return null;
  const parsed = endOfDay
    ? new Date(year, month - 1, date, 23, 59, 59, 999)
    : new Date(year, month - 1, date, 0, 0, 0, 0);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString();
}

function toPayload(form: typeof emptyForm) {
  const input: Record<string, unknown> = {
    code: form.code,
    percentOff: Number(form.percentOff),
    minSpendNzd: Number(form.minSpendNzd || 0),
    allowWithRewards: form.allowWithRewards,
    applyOn: form.applyOn,
    isActive: form.isActive,
  };
  if (form.maxDiscountNzd.trim()) {
    input.maxDiscountNzd = Number(form.maxDiscountNzd);
  }
  const startsAt = form.startsAt ? dateInputToIso(form.startsAt, false) : null;
  const expiresAt = form.expiresAt ? dateInputToIso(form.expiresAt, true) : null;
  if (startsAt) input.startsAt = startsAt;
  if (expiresAt) input.expiresAt = expiresAt;
  return input;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const getSearchText = useCallback(
    (coupon: Coupon) =>
      [
        coupon.code,
        applyOnLabel(coupon.applyOn),
        coupon.isActive ? "active" : "inactive",
      ].join(" "),
    [],
  );
  const list = usePagedSearch(coupons, getSearchText);

  async function load() {
    const data = await adminGql<{ coupons: Coupon[] }>(COUPONS_QUERY);
    setCoupons(data.coupons);
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      toast.error(err.message || "Could not load coupons");
    });
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function startEdit(coupon: Coupon) {
    setEditingId(coupon.id);
    setForm({
      code: coupon.code,
      percentOff: String(coupon.percentOff),
      minSpendNzd: String(coupon.minSpendNzd),
      maxDiscountNzd:
        coupon.maxDiscountNzd == null ? "" : String(coupon.maxDiscountNzd),
      startsAt: toDateInput(coupon.startsAt),
      expiresAt: toDateInput(coupon.expiresAt),
      allowWithRewards: coupon.allowWithRewards,
      applyOn: coupon.applyOn || "BOTH",
      isActive: coupon.isActive,
    });
    setFormOpen(true);
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
    setFormOpen(false);
  }

  async function save() {
    setSaving(true);
    try {
      const input = toPayload(form);
      if (editingId) {
        await adminGql(UPDATE_COUPON, { id: editingId, input });
        toast.success("Coupon updated");
      } else {
        await adminGql(STORE_COUPON, { input });
        toast.success("Coupon created");
      }
      resetForm();
      await load();
    } catch (err: any) {
      toast.error(err.message || "Could not save coupon");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await adminGql(DELETE_COUPON, { id });
      if (editingId === id) resetForm();
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Coupons
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Percentage promo codes for checkout. Optional min spend and a maximum
            dollar cap.
          </p>
        </div>
        {!formOpen ? (
          <button
            type="button"
            className="btn btn-primary !rounded-xl"
            onClick={startCreate}
          >
            Add new coupon
          </button>
        ) : null}
      </div>

      {formOpen ? (
        <div className="surface-card space-y-4 rounded-2xl p-4 sm:p-5">
          <h2 className="font-semibold">
            {editingId ? "Edit coupon" : "New coupon"}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Code</span>
              <input
                className="input uppercase"
                placeholder="JACK10"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Discount %</span>
              <input
                className="input"
                type="number"
                min="0.01"
                max="100"
                step="0.01"
                value={form.percentOff}
                onChange={(e) =>
                  setForm({ ...form, percentOff: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Min spend (NZD)</span>
              <input
                className="input"
                type="number"
                min="0"
                step="0.01"
                value={form.minSpendNzd}
                onChange={(e) =>
                  setForm({ ...form, minSpendNzd: e.target.value })
                }
              />
              <span className="text-xs text-[var(--muted)]">
                {form.applyOn === "FOOD"
                  ? "Required food subtotal. Liquor does not count."
                  : form.applyOn === "LIQUOR"
                    ? "Required liquor subtotal. Food does not count."
                    : "Required spend on the whole order."}
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Up to discount (NZD)</span>
              <input
                className="input"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="No cap"
                value={form.maxDiscountNzd}
                onChange={(e) =>
                  setForm({ ...form, maxDiscountNzd: e.target.value })
                }
              />
              <span className="text-xs text-[var(--muted)]">
                Caps the dollar amount off. Leave blank for no cap.
              </span>
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Start date</span>
              <input
                className="input"
                type="date"
                value={form.startsAt}
                onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              />
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-[var(--muted)]">Expiry date</span>
              <input
                className="input"
                type="date"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm({ ...form, expiresAt: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1 text-sm sm:col-span-2">
              <span className="text-[var(--muted)]">Applies to</span>
              <select
                className="input"
                value={form.applyOn}
                onChange={(e) =>
                  setForm({ ...form, applyOn: e.target.value as RedeemOn })
                }
              >
                <option value="BOTH">Food and liquor</option>
                <option value="FOOD">Food only</option>
                <option value="LIQUOR">Liquor only</option>
              </select>
            </label>
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.allowWithRewards}
              onChange={(e) =>
                setForm({ ...form, allowWithRewards: e.target.checked })
              }
            />
            <span>
              Customers can use this coupon when rewards are also applied
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={form.isActive}
              onChange={(e) =>
                setForm({ ...form, isActive: e.target.checked })
              }
            />
            <span>Active</span>
          </label>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn btn-primary"
              disabled={saving}
              onClick={save}
            >
              {saving ? "Saving…" : editingId ? "Update coupon" : "Add coupon"}
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search coupons…"
        />
      </div>

      <div className="space-y-2">
        {list.total === 0 ? (
          <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
            {coupons.length === 0
              ? "No coupons yet."
              : "No matches for that search."}
          </div>
        ) : (
          list.pageItems.map((coupon) => (
            <div
              key={coupon.id}
              className="surface-card flex flex-wrap items-start justify-between gap-3 rounded-2xl p-4"
            >
              <div>
                <div className="font-semibold tracking-wide">{coupon.code}</div>
                <div className="mt-1 text-sm text-[var(--muted)]">
                  {coupon.percentOff}% off
                  {coupon.maxDiscountNzd != null
                    ? ` up to $${Number(coupon.maxDiscountNzd).toFixed(2)}`
                    : ""}
                  {coupon.minSpendNzd > 0
                    ? ` · min $${Number(coupon.minSpendNzd).toFixed(2)}`
                    : ""}
                </div>
                <div className="mt-1 text-xs text-[var(--muted)]">
                  {coupon.startsAt || coupon.expiresAt
                    ? `${toDateInput(coupon.startsAt) || "Anytime"} → ${
                        toDateInput(coupon.expiresAt) || "No expiry"
                      }`
                    : "No date limits"}
                  {" · "}
                  {coupon.allowWithRewards
                    ? "OK with rewards"
                    : "Not with rewards"}
                  {" · "}
                  {applyOnLabel(coupon.applyOn)}
                  {" · "}
                  {coupon.isActive ? "Active" : "Inactive"}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="btn btn-secondary !px-3 !py-2 text-sm"
                  onClick={() => startEdit(coupon)}
                >
                  Edit
                </button>
                <button
                  className="btn btn-danger !px-3 !py-2 text-sm"
                  onClick={() => remove(coupon.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AdminPagination
        page={list.page}
        totalPages={list.totalPages}
        total={list.total}
        onPageChange={list.setPage}
      />
    </div>
  );
}
