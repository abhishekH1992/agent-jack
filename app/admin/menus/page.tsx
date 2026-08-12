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
});

function numOrNull(v: string) {
  const t = v.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
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
          label: `${c.name} · ${s.name}`,
        })),
      ),
    [categories],
  );

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
    });
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.subCategoryId) return toast.error("Select a subcategory");
    const fixedPrice = Number(form.fixedPrice);
    if (!Number.isFinite(fixedPrice)) {
      return toast.error("Fixed price must be a number");
    }

    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        image: form.image.trim() || null,
        fixedPrice,
        lowestPrice: numOrNull(form.lowestPrice),
        highestPrice: numOrNull(form.highestPrice),
        step: numOrNull(form.step),
        currentPrice: numOrNull(form.currentPrice) ?? fixedPrice,
        pricingEnabled: form.pricingEnabled,
        isEnable: form.isEnable,
        tags: form.tags,
        subCategoryId: form.subCategoryId,
      };
      if (editingId) {
        await adminGql(UPDATE_MENU, { id: editingId, input });
        toast.success("Menu updated");
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

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <div className="space-y-3">
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
                className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {menu.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={menu.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-semibold">{menu.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {menu.path} · {money(Number(menu.fixedPrice || 0))}
                      {menu.pricingEnabled ? " · Live bid" : ""}
                      {!menu.isEnable ? " · Hidden" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
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

        <div className="surface-card space-y-3 rounded-2xl p-5">
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
              onChange={(e) => setForm({ ...form, name: e.target.value })}
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
                setForm({ ...form, subCategoryId: e.target.value })
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
            <textarea
              className="input min-h-20 resize-y py-3"
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>

          <ImageUploadField
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
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
                  setForm({ ...form, fixedPrice: e.target.value })
                }
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Current price
              </span>
              <input
                className="input"
                inputMode="decimal"
                value={form.currentPrice}
                onChange={(e) =>
                  setForm({ ...form, currentPrice: e.target.value })
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
                  setForm({ ...form, lowestPrice: e.target.value })
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
                  setForm({ ...form, highestPrice: e.target.value })
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
                onChange={(e) => setForm({ ...form, step: e.target.value })}
              />
            </label>
          </div>

          <TagInput
            value={form.tags}
            onChange={(tags) => setForm({ ...form, tags })}
          />

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.pricingEnabled}
              onChange={(e) =>
                setForm({ ...form, pricingEnabled: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-sm font-medium">Live bidding enabled</span>
          </label>

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isEnable}
              onChange={(e) =>
                setForm({ ...form, isEnable: e.target.checked })
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
