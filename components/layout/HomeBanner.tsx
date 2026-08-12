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

function CtaButtons({
  buttons,
  centered,
}: {
  buttons: BannerButton[];
  centered?: boolean;
}) {
  if (!buttons.length) return null;
  return (
    <div
      className={clsx(
        "flex flex-wrap gap-2.5",
        centered ? "justify-center" : "justify-start",
      )}
    >
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
  );
}

function BannerOverlay({
  header,
  subheader,
  buttons,
}: {
  header: string;
  subheader: string;
  buttons: BannerButton[];
}) {
  const hasCopy = Boolean(header || subheader);
  if (!hasCopy && !buttons.length) return null;

  return (
    <>
      {/* Mobile: centered on image — text then buttons */}
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-black/35 px-5 sm:hidden">
        <div className="pointer-events-auto flex max-w-md flex-col items-center gap-4 text-center">
          {header ? (
            <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-white drop-shadow">
              {header}
            </h2>
          ) : null}
          {subheader ? (
            <p className="text-sm leading-snug text-white/90 drop-shadow">
              {subheader}
            </p>
          ) : null}
          <CtaButtons buttons={buttons} centered />
        </div>
      </div>

      {/* Desktop: bottom stack — text above buttons */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden bg-gradient-to-t from-black/60 via-black/30 to-transparent pt-20 pb-6 sm:block">
        <div className="page-shell pointer-events-auto space-y-3">
          {header ? (
            <h2 className="font-display max-w-2xl text-3xl font-bold leading-tight tracking-tight text-white md:text-4xl">
              {header}
            </h2>
          ) : null}
          {subheader ? (
            <p className="max-w-xl text-base text-white/90 md:text-lg">
              {subheader}
            </p>
          ) : null}
          <CtaButtons buttons={buttons} />
        </div>
      </div>
    </>
  );
}

function TextHero({
  siteName,
  header,
  subheader,
  buttons,
}: {
  siteName: string;
  header: string;
  subheader: string;
  buttons: BannerButton[];
}) {
  const title = header || siteName;
  const body =
    subheader ||
    "Scan your table QR, chase live liquor prices, and order without leaving your seat.";

  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(180deg,rgba(234,88,12,0.16),transparent)]"
      />
      <div className="page-shell relative py-8 sm:py-12">
        <h1 className="font-display max-w-[14ch] text-4xl font-bold leading-[1.05] tracking-tight text-[var(--ink)] sm:text-5xl md:text-6xl">
          {title}
        </h1>
        {body ? (
          <p className="mt-3 max-w-md text-base text-[var(--muted)] sm:text-lg">
            {body}
          </p>
        ) : null}
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
  header = "",
  subheader = "",
}: {
  banners: string[];
  siteName?: string;
  buttons?: BannerButton[];
  header?: string;
  subheader?: string;
}) {
  const slides = (banners || []).map((b) => b.trim()).filter(Boolean);
  const ctas = (buttons || []).filter((b) => b.label?.trim() && b.href?.trim());
  const title = (header || "").trim();
  const subtitle = (subheader || "").trim();
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
    return (
      <TextHero
        siteName={siteName}
        header={title}
        subheader={subtitle}
        buttons={ctas}
      />
    );
  }

  const multi = usableIndexes.length > 1;
  const hasCopy = Boolean(title || subtitle);

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
      <div className="relative aspect-[16/10] w-full min-h-[220px] max-h-[420px] sm:aspect-[21/9] sm:min-h-[260px]">
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

        <BannerOverlay
          header={title}
          subheader={subtitle}
          buttons={ctas}
        />

        {multi && (
          <>
            <div
              className={clsx(
                "absolute left-1/2 z-10 flex -translate-x-1/2 gap-1.5",
                hasCopy || ctas.length
                  ? "bottom-3 sm:bottom-[5.5rem]"
                  : "bottom-3",
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
