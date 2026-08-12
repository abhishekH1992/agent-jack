"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { MenuCard } from "@/components/menu/MenuCard";
import { ItemModal, ModalMenu } from "@/components/menu/ItemModal";
import { BidChatModal } from "@/components/bid/BidChatModal";

type MenuItem = ModalMenu & {
  id: string;
  name: string;
  image?: string | null;
  isEnable?: boolean;
};

type SubCategory = {
  id: string;
  name: string;
  image?: string | null;
  isEnable?: boolean;
  menus: MenuItem[];
};

type Category = {
  id: string;
  name: string;
  slug: string;
  categoryType?: { name?: string } | null;
  subCategories: SubCategory[];
};

export function MenuBrowseClient({
  categories,
  showCategory = true,
  showSubcategory = true,
}: {
  categories: Category[];
  showCategory?: boolean;
  showSubcategory?: boolean;
}) {
  const searchParams = useSearchParams();
  const paramCategory = searchParams.get("category") || "";
  const paramSub = searchParams.get("sub") || "";

  const enabled = useMemo(
    () =>
      categories
        .map((c) => ({
          ...c,
          subCategories: (c.subCategories || [])
            .filter((s) => s.isEnable !== false)
            .map((s) => ({
              ...s,
              menus: (s.menus || []).filter((m) => m.isEnable !== false),
            })),
        }))
        .filter((c) => c.subCategories.length > 0),
    [categories],
  );

  const initial = useMemo(() => {
    if (!enabled.length) {
      return { categoryId: "", subCategoryId: "" };
    }
    const bySlug = enabled.find(
      (c) => c.slug === paramCategory || c.id === paramCategory,
    );
    if (bySlug) {
      const sub =
        bySlug.subCategories.find((s) => s.id === paramSub) ||
        bySlug.subCategories[0];
      return { categoryId: bySlug.id, subCategoryId: sub?.id || "" };
    }
    if (paramSub) {
      for (const cat of enabled) {
        const sub = cat.subCategories.find((s) => s.id === paramSub);
        if (sub) {
          return { categoryId: cat.id, subCategoryId: sub.id };
        }
      }
    }
    return {
      categoryId: enabled[0].id,
      subCategoryId: enabled[0].subCategories[0]?.id || "",
    };
  }, [enabled, paramCategory, paramSub]);

  const [categoryId, setCategoryId] = useState(initial.categoryId);
  const [subCategoryId, setSubCategoryId] = useState(initial.subCategoryId);
  const [foodMenu, setFoodMenu] = useState<ModalMenu | null>(null);
  const [bidMenu, setBidMenu] = useState<ModalMenu | null>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const subSliderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!initial.categoryId) return;
    setCategoryId(initial.categoryId);
    setSubCategoryId(initial.subCategoryId);
  }, [initial.categoryId, initial.subCategoryId]);

  const activeCategory =
    enabled.find((c) => c.id === categoryId) || enabled[0] || null;

  const subs = useMemo(() => {
    if (showCategory) {
      return activeCategory?.subCategories || [];
    }
    // No category slider — list every subcategory across the catalog
    return enabled.flatMap((c) => c.subCategories);
  }, [showCategory, activeCategory, enabled]);

  const activeSub =
    subs.find((s) => s.id === subCategoryId) || subs[0] || null;

  const menus = useMemo(() => {
    if (showSubcategory) {
      return activeSub?.menus || [];
    }
    if (showCategory) {
      return (activeCategory?.subCategories || []).flatMap((s) => s.menus || []);
    }
    return enabled.flatMap((c) =>
      c.subCategories.flatMap((s) => s.menus || []),
    );
  }, [showSubcategory, showCategory, activeSub, activeCategory, enabled]);

  useEffect(() => {
    if (!enabled.length) return;
    if (!enabled.some((c) => c.id === categoryId)) {
      setCategoryId(enabled[0].id);
      setSubCategoryId(enabled[0].subCategories[0]?.id || "");
    }
  }, [enabled, categoryId]);

  useEffect(() => {
    if (!showSubcategory) return;
    if (!subs.length) return;
    if (!subs.some((s) => s.id === subCategoryId)) {
      setSubCategoryId(subs[0]?.id || "");
    }
  }, [subs, subCategoryId, showSubcategory]);

  useEffect(() => {
    if (!showCategory) return;
    const el = sliderRef.current?.querySelector<HTMLElement>(
      `[data-cat-id="${categoryId}"]`,
    );
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [categoryId, showCategory]);

  useEffect(() => {
    if (!showSubcategory) return;
    const el = subSliderRef.current?.querySelector<HTMLElement>(
      `[data-sub-id="${subCategoryId}"]`,
    );
    el?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [subCategoryId, showSubcategory]);

  function selectCategory(id: string) {
    const cat = enabled.find((c) => c.id === id);
    setCategoryId(id);
    setSubCategoryId(cat?.subCategories[0]?.id || "");
  }

  function selectSub(subId: string) {
    setSubCategoryId(subId);
    if (!showCategory) {
      const owner = enabled.find((c) =>
        c.subCategories.some((s) => s.id === subId),
      );
      if (owner) setCategoryId(owner.id);
    }
  }

  function openMenu(menu: MenuItem) {
    const normalized = {
      ...menu,
      variants: menu.variants || [],
      addons: menu.addons || [],
      pricingEnabled: Boolean(menu.pricingEnabled),
      fixedPrice: Number(menu.fixedPrice || 0),
    } as ModalMenu;
    if (normalized.pricingEnabled) setBidMenu(normalized);
    else setFoodMenu(normalized);
  }

  if (!enabled.length) {
    return (
      <div className="page-shell py-8 pb-32 text-sm text-[var(--muted)]">
        No menu categories available yet.
      </div>
    );
  }

  return (
    <div className="pb-32">
      {showCategory ? (
        <div className="border-b border-[var(--line)] pt-3">
          <div
            ref={sliderRef}
            className="page-shell flex gap-2 overflow-x-auto overscroll-x-contain py-3 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            {enabled.map((cat) => {
              const active = cat.id === (activeCategory?.id || "");
              return (
                <button
                  key={cat.id}
                  type="button"
                  data-cat-id={cat.id}
                  onClick={() => selectCategory(cat.id)}
                  className={clsx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition",
                    active
                      ? "bg-[var(--brand)] text-white"
                      : "bg-white text-[var(--ink)] ring-1 ring-[var(--line)] hover:bg-[var(--brand-soft)]",
                  )}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showSubcategory ? (
        <div className={clsx(showCategory ? "mt-5" : "mt-3")}>
          <div
            ref={subSliderRef}
            className="page-shell flex gap-3 overflow-x-auto overscroll-x-contain pb-1 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            {subs.map((sub) => {
              const active = sub.id === (activeSub?.id || "");
              return (
                <button
                  key={sub.id}
                  type="button"
                  data-sub-id={sub.id}
                  onClick={() => selectSub(sub.id)}
                  className={clsx(
                    "w-[6.5rem] shrink-0 overflow-hidden rounded-2xl border-2 bg-white text-left transition sm:w-28",
                    active
                      ? "border-[var(--brand)] shadow-md"
                      : "border-[var(--line)] hover:border-[var(--brand)]/50",
                  )}
                >
                  <div className="relative aspect-square bg-[var(--brand-soft)]">
                    {sub.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={sub.image}
                        alt=""
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
                        {sub.name}
                      </div>
                    )}
                  </div>
                  <div
                    className={clsx(
                      "truncate px-2 py-2 text-center text-xs font-semibold sm:text-sm",
                      active ? "text-[var(--brand)]" : "text-[var(--ink)]",
                    )}
                  >
                    {sub.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className={clsx(
          "page-shell",
          showSubcategory
            ? "mt-12 sm:mt-14"
            : showCategory
              ? "mt-6"
              : "mt-3 pt-3",
        )}
      >
        {menus.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            No items in this section yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 mt-6">
            {menus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onClick={() => openMenu(menu)}
              />
            ))}
          </div>
        )}
      </div>

      <ItemModal
        menu={foodMenu}
        isOpen={Boolean(foodMenu)}
        onClose={() => setFoodMenu(null)}
      />
      <BidChatModal
        menu={bidMenu}
        isOpen={Boolean(bidMenu)}
        onClose={() => setBidMenu(null)}
      />
    </div>
  );
}
