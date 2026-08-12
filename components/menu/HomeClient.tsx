"use client";

import { useMemo, useState } from "react";
import { ItemModal, ModalMenu } from "@/components/menu/ItemModal";
import { BidChatModal } from "@/components/bid/BidChatModal";
import { MenuSearch } from "@/components/menu/MenuSearch";
import { BeltSection } from "@/components/menu/BeltSection";
import { flattenMenusFromCategories, type SearchableMenu } from "@/lib/search";

export function HomeClient({
  belts,
  categories,
}: {
  belts: any[];
  categories: any[];
}) {
  const [foodMenu, setFoodMenu] = useState<ModalMenu | null>(null);
  const [bidMenu, setBidMenu] = useState<ModalMenu | null>(null);

  const allMenus = useMemo(
    () => flattenMenusFromCategories(categories),
    [categories],
  );

  function openMenu(menu: SearchableMenu | ModalMenu | any) {
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
    <div id="menu" className="page-shell space-y-10 py-6 pb-32 sm:space-y-12 sm:py-8">
      <section className="w-full">
        <MenuSearch menus={allMenus} onSelect={openMenu} />
      </section>

      {belts.map((belt) => (
        <BeltSection
          key={belt.id}
          name={belt.name}
          isSlider={Boolean(belt.isSlider)}
          menus={belt.menus || []}
          onSelect={openMenu}
        />
      ))}

      {belts.length === 0 && (
        <p className="text-sm text-[var(--muted)]">
          No home belts configured yet. Add some in Admin → Belts.
        </p>
      )}

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
