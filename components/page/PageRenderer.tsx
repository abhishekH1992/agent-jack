"use client";

import { useState } from "react";
import clsx from "clsx";
import { HomeBanner } from "@/components/layout/HomeBanner";
import { BeltSection } from "@/components/menu/BeltSection";
import { MenuBrowseBlock } from "@/components/menu/MenuBrowseBlock";
import { ItemModal, ModalMenu } from "@/components/menu/ItemModal";
import { BidChatModal } from "@/components/bid/BidChatModal";
import { ImageBlock } from "@/components/page/ImageBlock";

export type PageBlockData = {
  id: string;
  type: "IMAGE" | "RICH_TEXT" | "BELT" | "MENU_BROWSE";
  sortOrder: number;
  isEnable: boolean;
  images: string[];
  imageLayout?: "SINGLE" | "COLUMN" | "SLIDER" | null;
  isBanner: boolean;
  buttons?: Array<{ label: string; href: string; variant?: string }> | null;
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

function isBannerBlock(block: PageBlockData) {
  return block.type === "IMAGE" && block.isBanner;
}

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

  const showPageTitle =
    showTitle &&
    page.slug !== "home" &&
    page.slug !== "menu" &&
    page.slug !== "liquor";

  return (
    <div className="pb-32">
      {showPageTitle ? (
        <div className="page-shell pt-6">
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            {page.title}
          </h1>
        </div>
      ) : null}

      {blocks.map((block, index) => {
        const prev = blocks[index - 1];
        const prevBanner = prev ? isBannerBlock(prev) : false;
        const first = index === 0 && !showPageTitle;

        if (isBannerBlock(block)) {
          return (
            <div
              key={block.id}
              className={clsx(!first && "mt-10 sm:mt-12")}
            >
              <HomeBanner
                banners={block.images || []}
                siteName={siteName}
                buttons={block.buttons || []}
              />
            </div>
          );
        }

        if (block.type === "MENU_BROWSE") {
          return (
            <div
              key={block.id}
              className={clsx(!first && "mt-6 sm:mt-8")}
            >
              <MenuBrowseBlock content={block.content} />
            </div>
          );
        }

        return (
          <div
            key={block.id}
            className={clsx(
              "page-shell",
              first || prevBanner || (index === 0 && showPageTitle)
                ? "pt-6 sm:pt-8"
                : "pt-10 sm:pt-12",
            )}
          >
            {block.type === "IMAGE" ? (
              <ImageBlock
                images={block.images || []}
                layout={block.imageLayout || "SINGLE"}
              />
            ) : null}

            {block.type === "RICH_TEXT" ? (
              <div
                className="prose-page max-w-none text-[var(--ink)]"
                dangerouslySetInnerHTML={{
                  __html: block.content || "<p></p>",
                }}
              />
            ) : null}

            {block.type === "BELT" && block.belt ? (
              <BeltSection
                name={block.belt.name}
                isSlider={Boolean(block.belt.isSlider)}
                menus={block.belt.menus || []}
                onSelect={openMenu}
              />
            ) : null}
          </div>
        );
      })}

      {blocks.length === 0 ? (
        <p className="page-shell pt-6 text-sm text-[var(--muted)]">
          This page has no content yet.
        </p>
      ) : null}

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
