"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  MENU_QUERY,
  STORE_MENU,
  UPDATE_MENU,
} from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { TagInput } from "@/components/admin/TagInput";

type OptionRow = {
  key: string;
  id?: string;
  name: string;
  price: string;
};

type Form = {
  name: string;
  description: string;
  image: string;
  fixedPrice: string;
  lowestPrice: string;
  highestPrice: string;
  step: string;
  currentPrice: string;
  unitsPerStep: string;
  pricingEnabled: boolean;
  isEnable: boolean;
  tags: string[];
  subCategoryId: string;
  variants: OptionRow[];
  addons: OptionRow[];
};

const empty = (): Form => ({
  name: "",
  description: "",
  image: "",
  fixedPrice: "12",
  lowestPrice: "",
  highestPrice: "",
  step: "0.5",
  currentPrice: "",
  unitsPerStep: "5",
  pricingEnabled: false,
  isEnable: true,
  tags: [],
  subCategoryId: "",
  variants: [],
  addons: [],
});

function numOrNull(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function newOptionRow(): OptionRow {
  return {
    key: `opt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: "",
    price: "0",
  };
}

function rowsFromApi(list: any[] | undefined): OptionRow[] {
  return (list || []).map((row, i) => ({
    key: row.id || `row-${i}`,
    id: row.id,
    name: row.name || "",
    price: row.price == null ? "0" : String(row.price),
  }));
}

function optionsPayload(rows: OptionRow[]) {
  return rows
    .map((row) => ({
      id: row.id,
      name: row.name.trim(),
      price: Number(row.price),
    }))
    .filter((row) => row.name && Number.isFinite(row.price));
}

function formFromMenu(menu: any): Form {
  return {
    name: menu.name || "",
    description: menu.description || "",
    image: menu.image || "",
    fixedPrice: String(menu.fixedPrice ?? ""),
    lowestPrice: menu.lowestPrice == null ? "" : String(menu.lowestPrice),
    highestPrice: menu.highestPrice == null ? "" : String(menu.highestPrice),
    step: menu.step == null ? "0.5" : String(menu.step),
    currentPrice: menu.currentPrice == null ? "" : String(menu.currentPrice),
    unitsPerStep: String(menu.unitsPerStep ?? 5),
    pricingEnabled: Boolean(menu.pricingEnabled),
    isEnable: Boolean(menu.isEnable),
    tags: [...(menu.tags || [])],
    subCategoryId: menu.subCategoryId || "",
    variants: rowsFromApi(menu.variants),
    addons: rowsFromApi(menu.addons),
  };
}

function OptionListEditor({
  title,
  hint,
  rows,
  onChange,
}: {
  title: string;
  hint: string;
  rows: OptionRow[];
  onChange: (rows: OptionRow[]) => void;
}) {
  return (
    <div className="space-y-2 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">{title}</div>
          <p className="text-xs text-[var(--muted)]">{hint}</p>
        </div>
        <button
          type="button"
          className="btn btn-secondary !min-h-8 !rounded-lg !px-2 !py-1 text-xs"
          onClick={() => onChange([...rows, newOptionRow()])}
        >
          + Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">None yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid grid-cols-[1fr_5.5rem_auto] gap-2"
            >
              <input
                className="input !min-h-10"
                placeholder="Name"
                value={row.name}
                onChange={(e) =>
                  onChange(
                    rows.map((r) =>
                      r.key === row.key ? { ...r, name: e.target.value } : r,
                    ),
                  )
                }
              />
              <input
                className="input !min-h-10"
                inputMode="decimal"
                placeholder="Price"
                value={row.price}
                onChange={(e) =>
                  onChange(
                    rows.map((r) =>
                      r.key === row.key ? { ...r, price: e.target.value } : r,
                    ),
                  )
                }
              />
              <button
                type="button"
                className="btn btn-danger !min-h-10 !rounded-lg !px-3 text-xs"
                onClick={() => onChange(rows.filter((r) => r.key !== row.key))}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MenuEditor({ menuId }: { menuId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(menuId);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const subOptions = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).map((s: any) => ({
          id: s.id,
          categoryId: c.id,
          categoryType: (c.categoryType?.name || "").toLowerCase(),
          label: `${c.name} · ${s.name}`,
        })),
      ),
    [categories],
  );

  const selectedSub = useMemo(
    () => subOptions.find((s) => s.id === form.subCategoryId) || null,
    [subOptions, form.subCategoryId],
  );
  const isLiquorCategory = selectedSub?.categoryType === "liquor";

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const [catalog, menuData] = await Promise.all([
          adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY),
          menuId
            ? adminGql<{ menu: any }>(MENU_QUERY, { id: menuId })
            : Promise.resolve({ menu: null }),
        ]);
        if (cancelled) return;
        setCategories(catalog.categories);
        const firstSub = catalog.categories[0]?.subCategories?.[0]?.id || "";
        if (menuId) {
          if (!menuData.menu) {
            setNotFound(true);
            setForm(empty());
          } else {
            setForm(formFromMenu(menuData.menu));
          }
        } else {
          setForm({ ...empty(), subCategoryId: firstSub });
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [menuId]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.subCategoryId) return toast.error("Select a subcategory");
    const fixedPrice = Number(form.fixedPrice);
    if (!Number.isFinite(fixedPrice)) {
      return toast.error("Fixed price must be a number");
    }

    const liquor =
      (
        subOptions.find((s) => s.id === form.subCategoryId)?.categoryType || ""
      ) === "liquor";

    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim(),
        image: form.image.trim() || null,
        fixedPrice,
        lowestPrice: liquor ? numOrNull(form.lowestPrice) : null,
        highestPrice: liquor ? numOrNull(form.highestPrice) : null,
        step: liquor ? numOrNull(form.step) : null,
        currentPrice: liquor
          ? (numOrNull(form.currentPrice) ?? fixedPrice)
          : fixedPrice,
        unitsPerStep: liquor
          ? Math.max(1, Math.floor(Number(form.unitsPerStep) || 5))
          : 5,
        pricingEnabled: liquor ? form.pricingEnabled : false,
        isEnable: form.isEnable,
        tags: form.tags,
        subCategoryId: form.subCategoryId,
        variants: optionsPayload(form.variants),
        addons: optionsPayload(form.addons),
      };
      if (menuId) {
        await adminGql(UPDATE_MENU, { id: menuId, input });
        toast.success("Menu updated");
      } else {
        await adminGql(STORE_MENU, { input });
        toast.success("Menu created");
      }
      router.push("/admin/menus");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading menu…</div>;
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Menu not found.</p>
        <Link href="/admin/menus" className="btn btn-secondary !rounded-xl">
          Back to menus
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/menus"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Menus
        </Link>
        <h1
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {isEdit ? "Edit menu" : "New menu"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Food and liquor items. Enable live bidding for liquor pricing.
        </p>
      </div>

      <section className="surface-card space-y-4 rounded-2xl p-4 md:p-6">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Name *
          </span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Subcategory *
          </span>
          <select
            className="input"
            value={form.subCategoryId}
            onChange={(e) =>
              setForm((f) => ({ ...f, subCategoryId: e.target.value }))
            }
          >
            <option value="">Select subcategory</option>
            {subOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Description
          </span>
          <div className="h-28 overflow-hidden rounded-[var(--radius-md)] border border-[var(--line)] bg-[var(--surface)] focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[rgba(234,88,12,0.2)]">
            <textarea
              className="block h-full w-full resize-none overflow-y-auto border-0 bg-transparent px-4 py-3 text-base text-[var(--ink)] outline-none [scrollbar-width:thin]"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Short description shown on the menu card and add popup"
            />
          </div>
        </label>

        <ImageUploadField
          value={form.image}
          onChange={(image) => setForm((f) => ({ ...f, image }))}
        />

        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Fixed price *
            </span>
            <input
              className="input"
              inputMode="decimal"
              value={form.fixedPrice}
              onChange={(e) =>
                setForm((f) => ({ ...f, fixedPrice: e.target.value }))
              }
            />
          </label>
          {isLiquorCategory ? (
            <>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Current price
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.currentPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, currentPrice: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Lowest
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.lowestPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, lowestPrice: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Highest
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.highestPrice}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, highestPrice: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Bid step
                </span>
                <input
                  className="input"
                  inputMode="decimal"
                  value={form.step}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, step: e.target.value }))
                  }
                />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                  Units per step
                </span>
                <input
                  className="input"
                  inputMode="numeric"
                  value={form.unitsPerStep}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, unitsPerStep: e.target.value }))
                  }
                />
                <span className="text-xs text-[var(--muted)]">
                  Paid units needed before live price rises by one step (e.g. 5
                  sold → +$0.50).
                </span>
              </label>
            </>
          ) : null}
        </div>

        <TagInput
          value={form.tags}
          onChange={(tags) => setForm((f) => ({ ...f, tags }))}
        />

        <OptionListEditor
          title="Options"
          hint="Sizes / choices shown as radio buttons (e.g. Small, Large)."
          rows={form.variants}
          onChange={(variants) => setForm((f) => ({ ...f, variants }))}
        />

        <OptionListEditor
          title="Add-ons"
          hint="Optional extras shown as checkboxes (e.g. Extra Cheese)."
          rows={form.addons}
          onChange={(addons) => setForm((f) => ({ ...f, addons }))}
        />

        {isLiquorCategory ? (
          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.pricingEnabled}
              onChange={(e) =>
                setForm((f) => ({ ...f, pricingEnabled: e.target.checked }))
              }
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-sm font-medium">Live bidding enabled</span>
          </label>
        ) : null}

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.isEnable}
            onChange={(e) =>
              setForm((f) => ({ ...f, isEnable: e.target.checked }))
            }
            className="h-4 w-4 accent-[var(--brand)]"
          />
          <span className="text-sm font-medium">Enabled</span>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="btn btn-primary !rounded-xl"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : isEdit ? "Update menu" : "Create menu"}
          </button>
          <Link href="/admin/menus" className="btn btn-secondary !rounded-xl">
            Cancel
          </Link>
        </div>
      </section>
    </div>
  );
}
