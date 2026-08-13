"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { ADMIN_CATALOG_QUERY, DELETE_MENU } from "@/lib/queries";
import { money } from "@/lib/cart";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

export default function AdminMenusPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
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
  }

  useEffect(() => {
    load()
      .catch((err) => toast.error(err.message || "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this menu item?")) return;
    try {
      await adminGql(DELETE_MENU, { id });
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
        <Link href="/admin/menus/new" className="btn btn-primary !rounded-xl">
          New menu
        </Link>
      </div>

      <div className="grid max-w-3xl gap-2 sm:grid-cols-2">
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

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search by name, tags…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading menus…
        </div>
      ) : (
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
                <Link
                  href={`/admin/menus/${menu.id}`}
                  className="btn btn-secondary !px-3 !py-2 text-sm"
                >
                  Edit
                </Link>
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
