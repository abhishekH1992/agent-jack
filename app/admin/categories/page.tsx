"use client";

import { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  ADMIN_CATALOG_QUERY,
  DELETE_CATEGORY,
  STORE_CATEGORY,
  UPDATE_CATEGORY,
} from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type Form = {
  name: string;
  slug: string;
  image: string;
  isEnable: boolean;
  categoryTypeId: string;
};

const empty = (): Form => ({
  name: "",
  slug: "",
  image: "",
  isEnable: true,
  categoryTypeId: "",
});

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [types, setTypes] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);

  const getSearchText = useCallback(
    (cat: any) =>
      [cat.name, cat.slug, cat.categoryType?.name].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(categories, getSearchText);

  async function load() {
    const data = await adminGql<{
      categories: any[];
      categoryTypes: any[];
    }>(ADMIN_CATALOG_QUERY);
    setCategories(data.categories);
    setTypes(data.categoryTypes);
    setForm((f) => ({
      ...f,
      categoryTypeId: f.categoryTypeId || data.categoryTypes[0]?.id || "",
    }));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message || "Failed to load"));
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...empty(),
      categoryTypeId: types[0]?.id || "",
    });
  }

  function startEdit(cat: any) {
    setEditingId(cat.id);
    setForm({
      name: cat.name,
      slug: cat.slug || "",
      image: cat.image || "",
      isEnable: Boolean(cat.isEnable),
      categoryTypeId: cat.categoryType?.id || types[0]?.id || "",
    });
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.categoryTypeId) return toast.error("Select a type");
    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        image: form.image.trim() || null,
        isEnable: form.isEnable,
        categoryTypeId: form.categoryTypeId,
      };
      if (editingId) {
        await adminGql(UPDATE_CATEGORY, { id: editingId, input });
        toast.success("Category updated");
      } else {
        await adminGql(STORE_CATEGORY, { input });
        toast.success("Category created");
      }
      setEditingId(null);
      setForm({ ...empty(), categoryTypeId: types[0]?.id || "" });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this category and its subcategories/menus?")) return;
    try {
      await adminGql(DELETE_CATEGORY, { id });
      if (editingId === id) {
        setEditingId(null);
        setForm({ ...empty(), categoryTypeId: types[0]?.id || "" });
      }
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
            Categories
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Top-level menu groups (e.g. THE BASICS, ON TAP).
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          New category
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <AdminSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search categories…"
          />
          <div className="space-y-2">
            {list.total === 0 && (
              <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
                {categories.length === 0
                  ? "No categories yet."
                  : "No matches for that search."}
              </div>
            )}
            {list.pageItems.map((cat) => (
              <div
                key={cat.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {cat.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={cat.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-semibold">{cat.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {cat.categoryType?.name || "—"} · /{cat.slug} ·{" "}
                      {cat.subCategories?.length || 0} subcategories
                      {!cat.isEnable ? " · Hidden" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary !px-3 !py-2 text-sm"
                    onClick={() => startEdit(cat)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !px-3 !py-2 text-sm"
                    onClick={() => remove(cat.id)}
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
            {editingId ? "Edit category" : "Create category"}
          </h2>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Name *
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. THE BASICS"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Slug
            </span>
            <input
              className="input"
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              placeholder="auto from name if empty"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Type *
            </span>
            <select
              className="input"
              value={form.categoryTypeId}
              onChange={(e) =>
                setForm({ ...form, categoryTypeId: e.target.value })
              }
            >
              <option value="">Select type</option>
              {types.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>

          <ImageUploadField
            value={form.image}
            onChange={(image) => setForm({ ...form, image })}
          />

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

          <div className="flex flex-wrap gap-2">
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
