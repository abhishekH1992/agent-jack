"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  ADMIN_CATALOG_QUERY,
  BELTS_QUERY,
  DELETE_BELT,
  STORE_BELT,
  UPDATE_BELT,
} from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type SourceType = "CATEGORY" | "SUBCATEGORY" | "MENUS";

type BeltForm = {
  name: string;
  sourceType: SourceType;
  categoryId: string;
  subCategoryId: string;
  menuIds: string[];
  isSlider: boolean;
  isEnable: boolean;
  sortOrder: number;
};

const emptyForm = (): BeltForm => ({
  name: "",
  sourceType: "CATEGORY",
  categoryId: "",
  subCategoryId: "",
  menuIds: [],
  isSlider: false,
  isEnable: true,
  sortOrder: 0,
});

export default function AdminBeltsPage() {
  const [belts, setBelts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BeltForm>(emptyForm());
  const [busy, setBusy] = useState(false);

  const subCategories = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).map((s: any) => ({
          ...s,
          categoryName: c.name,
        })),
      ),
    [categories],
  );

  const allMenus = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).flatMap((s: any) =>
          (s.menus || []).map((m: any) => ({
            ...m,
            label: `${c.name} · ${s.name} · ${m.name}`,
          })),
        ),
      ),
    [categories],
  );

  const getSearchText = useCallback((belt: any) => {
    const source =
      belt.sourceType === "CATEGORY"
        ? belt.category?.name
        : belt.sourceType === "SUBCATEGORY"
          ? belt.subCategory?.name
          : "handpicked";
    return [belt.name, belt.sourceType, source].filter(Boolean).join(" ");
  }, []);
  const list = usePagedSearch(belts, getSearchText);

  async function load() {
    const [beltData, catalog] = await Promise.all([
      adminGql<{ belts: any[] }>(BELTS_QUERY),
      adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY),
    ]);
    setBelts(beltData.belts);
    setCategories(catalog.categories);
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      toast.error(err.message || "Failed to load belts");
    });
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...emptyForm(),
      sortOrder: belts.length,
      categoryId: categories[0]?.id || "",
      subCategoryId: subCategories[0]?.id || "",
    });
  }

  function startEdit(belt: any) {
    setEditingId(belt.id);
    setForm({
      name: belt.name,
      sourceType: belt.sourceType,
      categoryId: belt.categoryId || "",
      subCategoryId: belt.subCategoryId || "",
      menuIds: (belt.items || []).map((i: any) => i.menu.id),
      isSlider: Boolean(belt.isSlider),
      isEnable: Boolean(belt.isEnable),
      sortOrder: Number(belt.sortOrder || 0),
    });
  }

  function toggleMenu(id: string) {
    setForm((prev) => ({
      ...prev,
      menuIds: prev.menuIds.includes(id)
        ? prev.menuIds.filter((x) => x !== id)
        : [...prev.menuIds, id],
    }));
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        sourceType: form.sourceType,
        categoryId:
          form.sourceType === "CATEGORY" ? form.categoryId || null : null,
        subCategoryId:
          form.sourceType === "SUBCATEGORY" ? form.subCategoryId || null : null,
        menuIds: form.sourceType === "MENUS" ? form.menuIds : [],
        isSlider: form.isSlider,
        isEnable: form.isEnable,
        sortOrder: Number(form.sortOrder) || 0,
      };
      if (editingId) {
        await adminGql(UPDATE_BELT, { id: editingId, input });
        toast.success("Belt updated");
      } else {
        await adminGql(STORE_BELT, { input });
        toast.success("Belt created");
      }
      setEditingId(null);
      setForm(emptyForm());
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await adminGql(DELETE_BELT, { id });
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm());
      }
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  function sourceLabel(belt: any) {
    if (belt.sourceType === "CATEGORY") {
      return `Category · ${belt.category?.name || "—"}`;
    }
    if (belt.sourceType === "SUBCATEGORY") {
      return `Subcategory · ${belt.subCategory?.name || "—"}`;
    }
    return `Handpicked · ${belt.items?.length || 0} items`;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Belts
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Control home-page sections — category, subcategory, or handpicked
            menus. Grid or slider layout.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          New belt
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <AdminSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search belts…"
          />
          <div className="space-y-2">
            {list.total === 0 && (
              <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
                {belts.length === 0
                  ? "No belts yet. Create one or run the seeder."
                  : "No matches for that search."}
              </div>
            )}
            {list.pageItems.map((belt) => (
              <div
                key={belt.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{belt.name}</div>
                  <div className="text-xs text-[var(--muted)]">
                    #{belt.sortOrder} · {sourceLabel(belt)} ·{" "}
                    {belt.isSlider ? "Slider" : "Grid"}
                    {!belt.isEnable ? " · Hidden" : ""}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary !px-3 !py-2 text-sm"
                    onClick={() => startEdit(belt)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !px-3 !py-2 text-sm"
                    onClick={() => remove(belt.id)}
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

        <div className="surface-card space-y-4 rounded-2xl p-5">
          <h2 className="font-bold">
            {editingId ? "Edit belt" : "Create belt"}
          </h2>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Name *
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. On tap"
              required
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Source
            </span>
            <select
              className="input"
              value={form.sourceType}
              onChange={(e) =>
                setForm({
                  ...form,
                  sourceType: e.target.value as SourceType,
                })
              }
            >
              <option value="CATEGORY">Category</option>
              <option value="SUBCATEGORY">Subcategory</option>
              <option value="MENUS">Handpick menu items</option>
            </select>
          </label>

          {form.sourceType === "CATEGORY" && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Category
              </span>
              <select
                className="input"
                value={form.categoryId}
                onChange={(e) =>
                  setForm({ ...form, categoryId: e.target.value })
                }
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.sourceType === "SUBCATEGORY" && (
            <label className="block space-y-1">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Subcategory
              </span>
              <select
                className="input"
                value={form.subCategoryId}
                onChange={(e) =>
                  setForm({ ...form, subCategoryId: e.target.value })
                }
              >
                <option value="">Select subcategory</option>
                {subCategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.categoryName} · {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.sourceType === "MENUS" && (
            <div className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Menu items
              </span>
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] p-2">
                {allMenus.map((m) => (
                  <label
                    key={m.id}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2 py-2 text-sm hover:bg-[var(--brand-soft)]"
                  >
                    <input
                      type="checkbox"
                      checked={form.menuIds.includes(m.id)}
                      onChange={() => toggleMenu(m.id)}
                      className="accent-[var(--brand)]"
                    />
                    <span className="min-w-0 truncate">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isSlider}
              onChange={(e) =>
                setForm({ ...form, isSlider: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-sm font-medium">
              Slider view (unchecked = grid)
            </span>
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
            <span className="text-sm font-medium">Show on home page</span>
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Sort order
            </span>
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={form.sortOrder}
              onChange={(e) =>
                setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
              }
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={save}
            >
              {busy ? "Saving…" : editingId ? "Update belt" : "Create belt"}
            </button>
            {editingId && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm());
                }}
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
