"use client";

import { useMemo, useState } from "react";
import { MenuCard } from "@/components/menu/MenuCard";
import { ItemModal, ModalMenu } from "@/components/menu/ItemModal";
import { BidChatModal } from "@/components/bid/BidChatModal";
import { MenuSearch } from "@/components/menu/MenuSearch";
import { flattenMenusFromCategories, type SearchableMenu } from "@/lib/search";

export function CategoryClient({ category }: { category: any }) {
  const [foodMenu, setFoodMenu] = useState<ModalMenu | null>(null);
  const [bidMenu, setBidMenu] = useState<ModalMenu | null>(null);

  const menus = useMemo(
    () => flattenMenusFromCategories([category]),
    [category],
  );

  function openMenu(menu: SearchableMenu | ModalMenu) {
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

  return (
    <div className="space-y-8 pb-32 sm:space-y-10">
      <MenuSearch
        menus={menus}
        onSelect={openMenu}
        placeholder={`Search in ${category.name}…`}
      />

      {category.subCategories.map((sub: any) => (
        <section key={sub.id}>
          <h2 className="font-display mb-3 text-xl font-bold sm:mb-4 sm:text-2xl">
            {sub.name}
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
            {sub.menus.map((menu: any) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                onClick={() => openMenu(menu)}
              />
            ))}
          </div>
        </section>
      ))}

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
