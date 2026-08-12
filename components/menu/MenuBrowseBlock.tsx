"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { gql } from "@/lib/graphql";
import { CATEGORIES_QUERY } from "@/lib/queries";
import {
  parseMenuBrowseConfig,
  type MenuBrowseConfig,
  type MenuCatalog,
} from "@/lib/menu-browse";
import { MenuBrowseClient } from "@/components/menu/MenuBrowseClient";

function isLiquorCategory(c: any) {
  return (c.categoryType?.name || "").toLowerCase() === "liquor";
}

function filterCategories(categories: any[], catalog: MenuCatalog) {
  if (catalog === "all") {
    const food = categories.filter((c) => !isLiquorCategory(c));
    const liquor = categories.filter(isLiquorCategory);
    return [...food, ...liquor];
  }
  return categories.filter((c) =>
    catalog === "liquor" ? isLiquorCategory(c) : !isLiquorCategory(c),
  );
}

function MenuBrowseBlockInner({ config }: { config: MenuBrowseConfig }) {
  const [categories, setCategories] = useState<any[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    gql<{ categories: any[] }>(CATEGORIES_QUERY)
      .then((data) => {
        if (!cancelled) setCategories(data.categories || []);
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message || "Failed to load menu");
          setCategories([]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(
    () => filterCategories(categories || [], config.catalog),
    [categories, config.catalog],
  );

  if (error) {
    return (
      <div className="page-shell py-8 text-sm text-[var(--muted)]">{error}</div>
    );
  }
  if (categories === null) {
    return (
      <div className="page-shell py-8 text-sm text-[var(--muted)]">
        Loading menu…
      </div>
    );
  }

  return (
    <MenuBrowseClient
      categories={filtered}
      showCategory={config.showCategory}
      showSubcategory={config.showSubcategory}
    />
  );
}

/** CMS MENU_BROWSE block — same category / subcategory / menu UI as before. */
export function MenuBrowseBlock({
  content,
}: {
  content?: string | null;
}) {
  const config = parseMenuBrowseConfig(content);
  return (
    <Suspense
      fallback={
        <div className="page-shell py-8 text-sm text-[var(--muted)]">
          Loading menu…
        </div>
      }
    >
      <MenuBrowseBlockInner config={config} />
    </Suspense>
  );
}
