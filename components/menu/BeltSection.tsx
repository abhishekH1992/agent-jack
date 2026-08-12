"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MenuCard, type MenuCardData } from "@/components/menu/MenuCard";

function ArrowIcon({ dir }: { dir: "left" | "right" }) {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={dir === "left" ? "rotate-180" : undefined}
    >
      <path
        d="M9 5l7 7-7 7"
        stroke="currentColor"
        strokeWidth="2.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function BeltSection({
  name,
  isSlider,
  menus,
  onSelect,
}: {
  name: string;
  isSlider: boolean;
  menus: MenuCardData[];
  onSelect: (menu: MenuCardData) => void;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setCanPrev(el.scrollLeft > 4);
    setCanNext(max > 4 && el.scrollLeft < max - 4);
  }, []);

  useEffect(() => {
    if (!isSlider) return;
    const el = scrollerRef.current;
    if (!el) return;

    updateArrows();
    el.addEventListener("scroll", updateArrows, { passive: true });
    const ro = new ResizeObserver(updateArrows);
    ro.observe(el);
    window.addEventListener("resize", updateArrows);

    return () => {
      el.removeEventListener("scroll", updateArrows);
      ro.disconnect();
      window.removeEventListener("resize", updateArrows);
    };
  }, [isSlider, menus.length, updateArrows]);

  function scrollByDir(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>("[data-belt-card]");
    const step = card ? card.offsetWidth + 12 : Math.max(240, el.clientWidth * 0.8);
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  }

  if (!menus.length) return null;

  return (
    <section>
      <div className="mb-4 flex items-end justify-between gap-3 sm:mb-5">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">{name}</h2>
        {isSlider && (
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              aria-label={`Previous ${name}`}
              disabled={!canPrev}
              onClick={() => scrollByDir(-1)}
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--brand)] bg-white text-[var(--brand)] transition duration-200 enabled:active:scale-95 enabled:hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowIcon dir="left" />
            </button>
            <button
              type="button"
              aria-label={`Next ${name}`}
              disabled={!canNext}
              onClick={() => scrollByDir(1)}
              className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border-2 border-[var(--brand)] bg-white text-[var(--brand)] transition duration-200 enabled:active:scale-95 enabled:hover:bg-[var(--brand-soft)] disabled:cursor-not-allowed disabled:opacity-35"
            >
              <ArrowIcon dir="right" />
            </button>
          </div>
        )}
      </div>

      {isSlider ? (
        <div className="relative">
          <div
            ref={scrollerRef}
            className="flex gap-3 overflow-x-auto overscroll-x-contain pb-2 scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{ WebkitOverflowScrolling: "touch", touchAction: "pan-x" }}
          >
            {menus.map((menu) => (
              <div
                key={menu.id}
                data-belt-card
                className="w-[min(78vw,18rem)] shrink-0 sm:w-72"
              >
                <MenuCard menu={menu} onClick={() => onSelect(menu)} />
              </div>
            ))}
          </div>

          {canPrev && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[var(--page)] to-transparent sm:w-12"
            />
          )}
          {canNext && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[var(--page)] to-transparent sm:w-12"
            />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          {menus.map((menu) => (
            <MenuCard
              key={menu.id}
              menu={menu}
              onClick={() => onSelect(menu)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
