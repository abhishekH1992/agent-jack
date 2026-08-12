export type SearchableMenu = {
  id: string;
  name: string;
  description?: string | null;
  tags?: string[];
  pricingEnabled?: boolean;
  fixedPrice?: number;
  currentPrice?: number | null;
  lowestPrice?: number | null;
  highestPrice?: number | null;
  step?: number | null;
  variants?: { id: string; name: string; price: number }[];
  addons?: { id: string; name: string; price: number }[];
  categoryName?: string;
  subCategoryName?: string;
};

export function flattenMenusFromCategories(categories: any[]): SearchableMenu[] {
  const items: SearchableMenu[] = [];
  for (const cat of categories || []) {
    for (const sub of cat.subCategories || []) {
      for (const menu of sub.menus || []) {
        items.push({
          ...menu,
          categoryName: cat.name,
          subCategoryName: sub.name,
        });
      }
    }
  }
  return items;
}

export function searchMenus(menus: SearchableMenu[], query: string) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return menus
    .filter((m) => {
      const hay = [
        m.name,
        m.description || "",
        m.categoryName || "",
        m.subCategoryName || "",
        ...(m.tags || []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    })
    .slice(0, 12);
}
