"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { ADMIN_CATALOG_QUERY, DELETE_CATEGORY } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getSearchText = useCallback(
    (cat: any) =>
      [cat.name, cat.slug, cat.categoryType?.name].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(categories, getSearchText);

  async function load() {
    const data = await adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY);
    setCategories(data.categories);
  }

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this category and its subcategories/menus?")) return;
    try {
      await adminGql(DELETE_CATEGORY, { id });
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
        <Link
          href="/admin/categories/new"
          className="btn btn-primary !rounded-xl"
        >
          New category
        </Link>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search categories…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading categories…
        </div>
      ) : (
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
                <Link
                  href={`/admin/categories/${cat.id}`}
                  className="btn btn-secondary !px-3 !py-2 text-sm"
                >
                  Edit
                </Link>
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
      )}

      <AdminPagination
        page={list.page}
        totalPages={list.totalPages}
        total={list.total}
        onPageChange={list.setPage}
      />
    </div>
  );
}
