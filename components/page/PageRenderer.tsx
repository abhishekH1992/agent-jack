"use client";

import { useState } from "react";
import { HomeBanner } from "@/components/layout/HomeBanner";
import { BeltSection } from "@/components/menu/BeltSection";
import { ItemModal, ModalMenu } from "@/components/menu/ItemModal";
import { BidChatModal } from "@/components/bid/BidChatModal";
import { ImageBlock } from "@/components/page/ImageBlock";

export type PageBlockData = {
  id: string;
  type: "IMAGE" | "RICH_TEXT" | "BELT";
  sortOrder: number;
  isEnable: boolean;
  images: string[];
  imageLayout?: "SINGLE" | "COLUMN" | "SLIDER" | null;
  isBanner: boolean;
  content?: string | null;
  belt?: {
    id: string;
    name: string;
    isSlider: boolean;
    menus: any[];
  } | null;
};

export type PageData = {
  id: string;
  title: string;
  slug: string;
  blocks: PageBlockData[];
};

export function PageRenderer({
  page,
  siteName = "Agent Jack",
  showTitle = true,
}: {
  page: PageData;
  siteName?: string;
  showTitle?: boolean;
}) {
  const [foodMenu, setFoodMenu] = useState<ModalMenu | null>(null);
  const [bidMenu, setBidMenu] = useState<ModalMenu | null>(null);

  const blocks = [...(page.blocks || [])]
    .filter((b) => b.isEnable)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function openMenu(menu: any) {
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
    <div className="pb-32">
      {showTitle && page.slug !== "home" ? (
        <div className="page-shell pt-6">
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {page.title}
          </h1>
        </div>
      ) : null}

      <div className="space-y-10 py-6 sm:space-y-12 sm:py-8">
        {blocks.map((block) => {
          if (block.type === "IMAGE") {
            if (block.isBanner) {
              return (
                <HomeBanner
                  key={block.id}
                  banners={block.images || []}
                  siteName={siteName}
                />
              );
            }
            return (
              <div key={block.id} className="page-shell">
                <ImageBlock
                  images={block.images || []}
                  layout={block.imageLayout || "SINGLE"}
                />
              </div>
            );
          }

          if (block.type === "RICH_TEXT") {
            return (
              <div key={block.id} className="page-shell">
                <div
                  className="prose-page max-w-none text-[var(--ink)]"
                  dangerouslySetInnerHTML={{
                    __html: block.content || "<p></p>",
                  }}
                />
              </div>
            );
          }

          if (block.type === "BELT" && block.belt) {
            return (
              <div key={block.id} className="page-shell">
                <BeltSection
                  name={block.belt.name}
                  isSlider={Boolean(block.belt.isSlider)}
                  menus={block.belt.menus || []}
                  onSelect={openMenu}
                />
              </div>
            );
          }

          return null;
        })}

        {blocks.length === 0 ? (
          <p className="page-shell text-sm text-[var(--muted)]">
            This page has no content yet.
          </p>
        ) : null}
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
