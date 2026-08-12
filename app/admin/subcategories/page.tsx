"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import {
  ADMIN_CATALOG_QUERY,
  DELETE_SUBCATEGORY,
  STORE_SUBCATEGORY,
  UPDATE_SUBCATEGORY,
} from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

type Form = {
  name: string;
  image: string;
  isEnable: boolean;
  categoryId: string;
};

const empty = (): Form => ({
  name: "",
  image: "",
  isEnable: true,
  categoryId: "",
});

export default function AdminSubcategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);

  const subs = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).map((s: any) => ({
          ...s,
          categoryName: c.name,
          categoryId: s.categoryId || c.id,
        })),
      ),
    [categories],
  );

  const getSearchText = useCallback(
    (sub: any) => [sub.name, sub.categoryName].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(subs, getSearchText);

  async function load() {
    const data = await adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY);
    setCategories(data.categories);
    setForm((f) => ({
      ...f,
      categoryId: f.categoryId || data.categories[0]?.id || "",
    }));
  }

  useEffect(() => {
    load().catch((err) => toast.error(err.message || "Failed to load"));
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm({
      ...empty(),
      categoryId: categories[0]?.id || "",
    });
  }

  function startEdit(sub: any) {
    setEditingId(sub.id);
    setForm({
      name: sub.name,
      image: sub.image || "",
      isEnable: Boolean(sub.isEnable),
      categoryId: sub.categoryId || "",
    });
  }

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.categoryId) return toast.error("Select a category");
    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        image: form.image.trim() || null,
        isEnable: form.isEnable,
        categoryId: form.categoryId,
      };
      if (editingId) {
        await adminGql(UPDATE_SUBCATEGORY, { id: editingId, input });
        toast.success("Subcategory updated");
      } else {
        await adminGql(STORE_SUBCATEGORY, { input });
        toast.success("Subcategory created");
      }
      setEditingId(null);
      setForm({ ...empty(), categoryId: categories[0]?.id || "" });
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this subcategory and its menus?")) return;
    try {
      await adminGql(DELETE_SUBCATEGORY, { id });
      if (editingId === id) {
        setEditingId(null);
        setForm({ ...empty(), categoryId: categories[0]?.id || "" });
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
            Subcategories
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Sections inside a category (e.g. BURGER, BEER).
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          New subcategory
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <AdminSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search subcategories…"
          />
          <div className="space-y-2">
            {list.total === 0 && (
              <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
                {subs.length === 0
                  ? "No subcategories yet. Create a category first if needed."
                  : "No matches for that search."}
              </div>
            )}
            {list.pageItems.map((sub) => (
              <div
                key={sub.id}
                className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {sub.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={sub.image}
                      alt=""
                      className="h-12 w-12 shrink-0 rounded-lg object-cover"
                    />
                  ) : null}
                  <div className="min-w-0">
                    <div className="font-semibold">{sub.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {sub.categoryName} · {sub.menus?.length || 0} menus
                      {!sub.isEnable ? " · Hidden" : ""}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary !px-3 !py-2 text-sm"
                    onClick={() => startEdit(sub)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !px-3 !py-2 text-sm"
                    onClick={() => remove(sub.id)}
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
            {editingId ? "Edit subcategory" : "Create subcategory"}
          </h2>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Name *
            </span>
            <input
              className="input"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. BURGER"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Category *
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
