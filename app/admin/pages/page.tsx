"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { DELETE_PAGE, PAGES_QUERY } from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";

export default function AdminPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const getSearchText = useCallback(
    (p: any) => [p.title, p.slug].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(pages, getSearchText);

  async function load() {
    const pageData = await adminGql<{ pages: any[] }>(PAGES_QUERY);
    setPages(pageData.pages);
  }

  useEffect(() => {
    load()
      .catch((err) => {
        console.error(err);
        toast.error(err.message || "Failed to load pages");
      })
      .finally(() => setLoading(false));
  }, []);

  async function remove(id: string) {
    if (!confirm("Delete this page?")) return;
    try {
      await adminGql(DELETE_PAGE, { id });
      toast.success("Deleted");
      await load();
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
            Pages
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Home, menu, and other CMS pages.
          </p>
        </div>
        <Link href="/admin/pages/new" className="btn btn-primary !rounded-xl">
          New page
        </Link>
      </div>

      <div className="max-w-xl">
        <AdminSearchBar
          value={list.query}
          onChange={list.setQuery}
          placeholder="Search pages…"
        />
      </div>

      {loading ? (
        <div className="surface-card rounded-2xl p-6 text-sm text-[var(--muted)]">
          Loading pages…
        </div>
      ) : (
        <div className="space-y-2">
          {list.pageItems.map((page) => (
            <div
              key={page.id}
              className="surface-card flex items-start justify-between gap-3 rounded-2xl p-4"
            >
              <div className="min-w-0">
                <div className="font-semibold">{page.title}</div>
                <div className="text-xs text-[var(--muted)]">
                  /{page.slug} · {page.blocks?.length || 0} blocks
                  {!page.isEnable ? " · disabled" : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                <Link
                  href={`/admin/pages/${page.id}`}
                  className="btn btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
                >
                  Edit
                </Link>
                <button
                  type="button"
                  className="btn btn-danger !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
                  onClick={() => remove(page.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {list.total === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {pages.length === 0
                ? "No pages yet."
                : "No pages match that search."}
            </p>
          ) : null}
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
