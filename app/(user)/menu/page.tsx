import { Suspense } from "react";
import { gql } from "@/lib/graphql";
import { CATEGORIES_QUERY } from "@/lib/queries";
import { MenuBrowseClient } from "@/components/menu/MenuBrowseClient";

export default async function MenuPage() {
  let categories: any[] = [];
  try {
    const data = await gql<{ categories: any[] }>(CATEGORIES_QUERY);
    // Food menu page — exclude Liquor (has its own nav entry)
    categories = (data.categories || []).filter(
      (c) => (c.categoryType?.name || "").toLowerCase() !== "liquor",
    );
  } catch {
    categories = [];
  }

  return (
    <Suspense
      fallback={
        <div className="page-shell py-8 text-sm text-[var(--muted)]">
          Loading menu…
        </div>
      }
    >
      <MenuBrowseClient categories={categories} />
    </Suspense>
  );
}
