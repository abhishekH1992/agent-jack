"use client";

import { useMemo, useState } from "react";
import { searchMenus, type SearchableMenu } from "@/lib/search";
import { money } from "@/lib/cart";

export function MenuSearch({
  menus,
  onSelect,
  placeholder = "Search burgers, beer, pasta…",
}: {
  menus: SearchableMenu[];
  onSelect: (menu: SearchableMenu) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const results = useMemo(() => searchMenus(menus, query), [menus, query]);

  return (
    <div className="relative w-full">
      <div className="flex min-h-12 items-center gap-2 rounded-2xl border-2 border-[var(--line)] bg-white px-3 py-2 shadow-sm transition duration-200 focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[rgba(234,88,12,0.18)]">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          className="shrink-0 text-[var(--muted)]"
          aria-hidden
        >
          <path
            d="M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm10 2-5.2-5.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
        <input
          className="w-full bg-transparent text-base outline-none placeholder:text-[var(--muted)]"
          placeholder={placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search menu"
          enterKeyHint="search"
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="min-h-11 min-w-11 cursor-pointer text-xs font-semibold text-[var(--muted)]"
            onClick={() => setQuery("")}
          >
            Clear
          </button>
        )}
      </div>

      {query.trim() && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 max-h-[min(22rem,55vh)] overflow-y-auto overscroll-contain rounded-2xl border border-[var(--line)] bg-white p-2 shadow-xl">
          {results.length === 0 ? (
            <div className="px-3 py-6 text-center text-sm text-[var(--muted)]">
              No matches for “{query.trim()}”
            </div>
          ) : (
            results.map((menu) => (
              <button
                key={menu.id}
                type="button"
                className="flex min-h-14 w-full cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-3 text-left transition duration-150 active:bg-[var(--brand-soft)] sm:hover:bg-[var(--brand-soft)]"
                onClick={() => {
                  onSelect(menu);
                  setQuery("");
                }}
              >
                <div className="min-w-0">
                  <div className="truncate font-semibold">{menu.name}</div>
                  <div className="truncate text-xs text-[var(--muted)]">
                    {[menu.categoryName, menu.subCategoryName]
                      .filter(Boolean)
                      .join(" · ")}
                    {menu.pricingEnabled ? " · Live bid" : ""}
                  </div>
                </div>
                {!menu.pricingEnabled && (
                  <div className="shrink-0 text-sm font-semibold">
                    {money(Number(menu.fixedPrice || 0))}
                  </div>
                )}
                {menu.pricingEnabled && (
                  <span className="shrink-0 rounded-full bg-[var(--brand)] px-2.5 py-1 text-xs font-semibold text-white">
                    Bid
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
