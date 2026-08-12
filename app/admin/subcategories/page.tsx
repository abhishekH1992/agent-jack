"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { ADMIN_CATALOG_QUERY, DELETE_SUBCATEGORY } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

export default function AdminSubcategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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
  }

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this subcategory and its menus?")) return;
    try {
      await adminGql(DELETE_SUBCATEGORY, { id });
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
        <Link
          href="/admin/subcategories/new"
          className="btn btn-primary !rounded-xl"
        >
          New subcategory
        </Link>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search subcategories…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading subcategories…
        </div>
      ) : (
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
                <Link
                  href={`/admin/subcategories/${sub.id}`}
                  className="btn btn-secondary !px-3 !py-2 text-sm"
                >
                  Edit
                </Link>
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
