"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";

export type BannerButton = {
  label: string;
  href: string;
  variant?: "primary" | "secondary" | string;
};

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

function BannerCtas({ buttons }: { buttons: BannerButton[] }) {
  if (!buttons.length) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/55 via-black/25 to-transparent pt-16 pb-5 sm:pb-6">
      <div className="page-shell pointer-events-auto">
        <div className="flex flex-wrap justify-start gap-2.5">
          {buttons.map((btn) => {
            const secondary = btn.variant === "secondary";
            const external = /^https?:\/\//i.test(btn.href);
            const className = clsx(
              "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm font-semibold transition duration-200 active:scale-[0.98]",
              secondary
                ? "border-2 border-white bg-white/95 text-[var(--brand)] hover:bg-white"
                : "bg-[var(--cta)] text-white hover:opacity-90",
            );
            if (external) {
              return (
                <a
                  key={`${btn.label}-${btn.href}`}
                  href={btn.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={className}
                >
                  {btn.label}
                </a>
              );
            }
            return (
              <Link
                key={`${btn.label}-${btn.href}`}
                href={btn.href}
                className={className}
              >
                {btn.label}
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function TextHero({
  siteName,
  buttons,
}: {
  siteName: string;
  buttons: BannerButton[];
}) {
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(234,88,12,0.16),transparent)]"
      />
      <div className="page-shell relative py-8 sm:py-12">
        <h1 className="font-display max-w-[12ch] text-4xl font-bold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-5xl md:text-6xl">
          {siteName}
        </h1>
        <p className="mt-3 max-w-md text-base text-[var(--muted)] sm:text-lg">
          Scan your table QR, chase live liquor prices, and order without
          leaving your seat.
        </p>
        {buttons.length > 0 ? (
          <div className="mt-6 flex flex-wrap justify-start gap-3">
            {buttons.map((btn) => {
              const secondary = btn.variant === "secondary";
              return (
                <Link
                  key={`${btn.label}-${btn.href}`}
                  href={btn.href}
                  className={clsx(
                    "inline-flex min-h-12 cursor-pointer items-center justify-center rounded-full px-6 text-sm font-semibold transition duration-200 active:scale-[0.98]",
                    secondary
                      ? "border-2 border-[var(--brand)] bg-white text-[var(--brand)] hover:bg-[var(--brand-soft)]"
                      : "bg-[var(--cta)] text-white hover:opacity-90",
                  )}
                >
                  {btn.label}
                </Link>
              );
            })}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function HomeBanner({
  banners,
  siteName = "Agent Jack",
  buttons = [],
}: {
  banners: string[];
  siteName?: string;
  buttons?: BannerButton[];
}) {
  const slides = (banners || []).map((b) => b.trim()).filter(Boolean);
  const ctas = (buttons || []).filter((b) => b.label?.trim() && b.href?.trim());
  const [index, setIndex] = useState(0);
  const [failed, setFailed] = useState<Record<number, boolean>>({});
  const [touchStartX, setTouchStartX] = useState<number | null>(null);

  const usableIndexes = slides
    .map((_, i) => i)
    .filter((i) => !failed[i]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (usableIndexes.length < 2) return;
      const pos = usableIndexes.indexOf(index);
      const nextPos =
        (pos + dir + usableIndexes.length) % usableIndexes.length;
      setIndex(usableIndexes[nextPos] ?? usableIndexes[0]);
    },
    [index, usableIndexes],
  );

  useEffect(() => {
    if (usableIndexes.length < 2) return;
    const id = window.setInterval(() => go(1), 5000);
    return () => window.clearInterval(id);
  }, [go, usableIndexes.length]);

  useEffect(() => {
    if (!slides.length) return;
    if (failed[index] && usableIndexes.length > 0) {
      setIndex(usableIndexes[0]);
    }
  }, [failed, index, slides.length, usableIndexes]);

  if (!slides.length || usableIndexes.length === 0) {
    return <TextHero siteName={siteName} buttons={ctas} />;
  }

  const multi = usableIndexes.length > 1;

  return (
    <section
      className="relative overflow-hidden bg-[var(--brand-soft)]"
      aria-roledescription="carousel"
      aria-label="Promotional banners"
      onTouchStart={(e) => setTouchStartX(e.changedTouches[0]?.clientX ?? null)}
      onTouchEnd={(e) => {
        if (touchStartX == null) return;
        const dx = (e.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
        if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
        setTouchStartX(null);
      }}
    >
      <div className="relative aspect-[16/10] w-full min-h-[200px] max-h-[420px] sm:aspect-[21/9] sm:min-h-[260px]">
        {usableIndexes.map((i) => (
          <div
            key={slides[i]}
            className={`absolute inset-0 transition-opacity duration-500 ${
              i === index ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
            aria-hidden={i !== index}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slides[i]}
              alt=""
              className="h-full w-full object-cover"
              onError={() =>
                setFailed((prev) => ({
                  ...prev,
                  [i]: true,
                }))
              }
            />
          </div>
        ))}

        <BannerCtas buttons={ctas} />

        {multi && (
          <>
            <div
              className={clsx(
                "absolute left-1/2 z-10 flex -translate-x-1/2 gap-1.5",
                ctas.length ? "bottom-[4.75rem] sm:bottom-20" : "bottom-3",
              )}
            >
              {usableIndexes.map((i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Go to banner ${usableIndexes.indexOf(i) + 1}`}
                  onClick={() => setIndex(i)}
                  className={`h-2 cursor-pointer rounded-full transition ${
                    i === index ? "w-5 bg-white" : "w-2 bg-white/55"
                  }`}
                />
              ))}
            </div>

            <div className="absolute inset-y-0 left-0 right-0 z-10 hidden items-center justify-between px-3 sm:flex">
              <button
                type="button"
                aria-label="Previous banner"
                onClick={() => go(-1)}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/30 text-white backdrop-blur transition hover:bg-black/45"
              >
                <ArrowIcon dir="left" />
              </button>
              <button
                type="button"
                aria-label="Next banner"
                onClick={() => go(1)}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full border border-white/40 bg-black/30 text-white backdrop-blur transition hover:bg-black/45"
              >
                <ArrowIcon dir="right" />
              </button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
