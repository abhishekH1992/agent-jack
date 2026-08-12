"use client";

import { useEffect, useMemo, useState } from "react";

export const ADMIN_PAGE_SIZE = 10;

export function usePagedSearch<T>(
  items: T[],
  getSearchText: (item: T) => string,
  pageSize = ADMIN_PAGE_SIZE,
) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((item) =>
      getSearchText(item).toLowerCase().includes(q),
    );
  }, [items, query, getSearchText]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(Math.max(1, page), totalPages);

  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [page, safePage]);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, safePage, pageSize]);

  function setSearch(next: string) {
    setQuery(next);
    setPage(1);
  }

  return {
    query,
    setQuery: setSearch,
    page: safePage,
    setPage,
    totalPages,
    total: filtered.length,
    pageItems,
    resetPage: () => setPage(1),
  };
}
