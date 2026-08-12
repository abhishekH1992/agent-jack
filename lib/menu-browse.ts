export type MenuCatalog = "food" | "liquor" | "all";

export type MenuBrowseConfig = {
  catalog: MenuCatalog;
  showCategory: boolean;
  showSubcategory: boolean;
};

const DEFAULT: MenuBrowseConfig = {
  catalog: "food",
  showCategory: true,
  showSubcategory: true,
};

export function parseMenuCatalog(raw?: string | null): MenuCatalog {
  const v = (raw || "food").trim().toLowerCase();
  if (v === "liquor") return "liquor";
  if (v === "all") return "all";
  return "food";
}

/** MENU_BROWSE `content`: JSON config or legacy "food"|"liquor"|"all". */
export function parseMenuBrowseConfig(raw?: string | null): MenuBrowseConfig {
  const text = (raw || "").trim();
  if (!text) return { ...DEFAULT };

  if (text === "food" || text === "liquor" || text === "all") {
    return { ...DEFAULT, catalog: text };
  }

  try {
    const parsed = JSON.parse(text) as Partial<MenuBrowseConfig>;
    return {
      catalog: parseMenuCatalog(parsed.catalog ?? "food"),
      showCategory: parsed.showCategory !== false,
      showSubcategory: parsed.showSubcategory !== false,
    };
  } catch {
    return { ...DEFAULT, catalog: parseMenuCatalog(text) };
  }
}

export function serializeMenuBrowseConfig(config: MenuBrowseConfig): string {
  return JSON.stringify({
    catalog: config.catalog,
    showCategory: config.showCategory,
    showSubcategory: config.showSubcategory,
  });
}
