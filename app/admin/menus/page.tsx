"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  ADMIN_CATALOG_QUERY,
  DELETE_MENU,
  STORE_MENU,
  UPDATE_MENU,
} from "@/lib/queries";
import { money } from "@/lib/cart";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";
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

export default function AdminMenusPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [filterSubCategoryId, setFilterSubCategoryId] = useState("");

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

  const filterSubOptions = useMemo(() => {
    if (!filterCategoryId) return subOptions;
    return subOptions.filter((s) => s.categoryId === filterCategoryId);
  }, [filterCategoryId, subOptions]);

  const menus = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).flatMap((s: any) =>
          (s.menus || []).map((m: any) => ({
            ...m,
            categoryId: c.id,
            subCategoryId: m.subCategoryId || s.id,
            path: `${c.name} · ${s.name}`,
          })),
        ),
      ),
    [categories],
  );

  const filteredMenus = useMemo(() => {
    return menus.filter((m) => {
      if (filterCategoryId && m.categoryId !== filterCategoryId) return false;
      if (filterSubCategoryId && m.subCategoryId !== filterSubCategoryId) {
        return false;
      }
      return true;
    });
  }, [menus, filterCategoryId, filterSubCategoryId]);

  const getSearchText = useCallback(
    (menu: any) =>
      [menu.name, menu.path, menu.description, ...(menu.tags || [])]
        .filter(Boolean)
        .join(" "),
    [],
  );
  const list = usePagedSearch(filteredMenus, getSearchText);

  async function load() {
    const data = await adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY);
    setCategories(data.categories);
    const firstSub = data.categories[0]?.subCategories?.[0]?.id || "";
    setForm((f) => ({
      ...f,
      subCategoryId: f.subCategoryId || firstSub,
    }));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message || "Failed to load"));
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...empty(),
      subCategoryId: subOptions[0]?.id || "",
    });
  }

  function startEdit(menu: any) {
    setEditingId(menu.id);
    setForm({
      name: menu.name || "",
      description: menu.description || "",
      image: menu.image || "",
      fixedPrice: String(menu.fixedPrice ?? ""),
      lowestPrice:
        menu.lowestPrice == null ? "" : String(menu.lowestPrice),
      highestPrice:
        menu.highestPrice == null ? "" : String(menu.highestPrice),
      step: menu.step == null ? "0.5" : String(menu.step),
      currentPrice:
        menu.currentPrice == null ? "" : String(menu.currentPrice),
      pricingEnabled: Boolean(menu.pricingEnabled),
      isEnable: Boolean(menu.isEnable),
      tags: [...(menu.tags || [])],
      subCategoryId: menu.subCategoryId || "",
      variants: rowsFromApi(menu.variants),
      addons: rowsFromApi(menu.addons),
    });
  }

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
        pricingEnabled: liquor ? form.pricingEnabled : false,
        isEnable: form.isEnable,
        tags: form.tags,
        subCategoryId: form.subCategoryId,
        variants: optionsPayload(form.variants),
        addons: optionsPayload(form.addons),
      };
      if (editingId) {
        const data = await adminGql<{ updateMenu: { description?: string | null } }>(
          UPDATE_MENU,
          { id: editingId, input },
        );
        toast.success("Menu updated");
        // Keep form in sync with what the API actually saved
        setForm((f) => ({
          ...f,
          description: data.updateMenu.description || "",
        }));
      } else {
        await adminGql(STORE_MENU, { input });
        toast.success("Menu created");
      }
      setEditingId(null);
      setForm({
        ...empty(),
        subCategoryId: subOptions[0]?.id || "",
      });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this menu item?")) return;
    try {
      await adminGql(DELETE_MENU, { id });
      if (editingId === id) startCreate();
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
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
            Menus
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Food and liquor items. Enable live bidding for liquor pricing.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          New menu
        </button>
      </div>

      <div className="grid min-w-0 gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="min-w-0 space-y-3">
          <div className="grid gap-2 sm:grid-cols-2">
            <select
              className="input"
              value={filterCategoryId}
              aria-label="Filter by category"
              onChange={(e) => {
                setFilterCategoryId(e.target.value);
                setFilterSubCategoryId("");
                list.resetPage();
              }}
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="input"
              value={filterSubCategoryId}
              aria-label="Filter by subcategory"
              onChange={(e) => {
                setFilterSubCategoryId(e.target.value);
                list.resetPage();
              }}
            >
              <option value="">All subcategories</option>
              {filterSubOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <AdminSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search by name, tags…"
          />
          <div className="space-y-2">
            {list.total === 0 && (
              <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
                {menus.length === 0
                  ? "No menus yet. Create a subcategory first if needed."
                  : "No matches for those filters."}
              </div>
            )}
            {list.pageItems.map((menu) => (
              <div
                key={menu.id}
                className="surface-card flex items-start gap-3 overflow-hidden rounded-2xl p-4"
              >
                {menu.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={menu.image}
                    alt=""
                    className="h-12 w-12 shrink-0 rounded-lg object-cover"
                  />
                ) : null}
                <div className="min-w-0 flex-1 overflow-hidden">
                  <div className="truncate font-semibold">{menu.name}</div>
                  {menu.description ? (
                    <p className="mt-0.5 line-clamp-2 break-words text-xs text-[var(--ink)]/80">
                      {menu.description}
                    </p>
                  ) : null}
                  <div className="mt-0.5 truncate text-xs text-[var(--muted)]">
                    {menu.path} · {money(Number(menu.fixedPrice || 0))}
                    {menu.pricingEnabled ? " · Live bid" : ""}
                    {!menu.isEnable ? " · Hidden" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary !px-3 !py-2 text-sm"
                    onClick={() => startEdit(menu)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !px-3 !py-2 text-sm"
                    onClick={() => remove(menu.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
          <AdminPagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            onPageChange={list.setPage}
          />
        </div>

        <div className="surface-card min-w-0 space-y-3 overflow-hidden rounded-2xl p-5">
          <h2 className="font-bold">
            {editingId ? "Edit menu" : "Create menu"}
          </h2>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Name *
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) =>
                setForm((f) => ({ ...f, name: e.target.value }))
              }
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

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={save}
            >
              {busy ? "Saving…" : editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={startCreate}
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
