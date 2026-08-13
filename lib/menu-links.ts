export type MenuLinkType = "custom" | "category" | "subcategory";

export function menuCategoryHref(categorySlug: string) {
  return `/menu?category=${encodeURIComponent(categorySlug)}`;
}

export function menuSubcategoryHref(categorySlug: string, subId: string) {
  return `/menu?category=${encodeURIComponent(categorySlug)}&sub=${encodeURIComponent(subId)}`;
}

export function parseMenuButtonHref(href: string): {
  linkType: MenuLinkType;
  categorySlug: string;
  subId: string;
} {
  const raw = (href || "").trim();
  if (!raw.startsWith("/menu")) {
    return { linkType: "custom", categorySlug: "", subId: "" };
  }
  try {
    const url = new URL(raw, "http://local");
    const categorySlug = url.searchParams.get("category") || "";
    const subId = url.searchParams.get("sub") || "";
    if (categorySlug && subId) {
      return { linkType: "subcategory", categorySlug, subId };
    }
    if (categorySlug) {
      return { linkType: "category", categorySlug, subId: "" };
    }
  } catch {
    // ignore
  }
  return { linkType: "custom", categorySlug: "", subId: "" };
}
