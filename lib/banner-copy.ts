export type BannerCopy = {
  header: string;
  subheader: string;
};

export type BannerButton = {
  label: string;
  href: string;
  variant: "primary" | "secondary" | string;
};

export type BannerSlide = {
  src: string;
  header: string;
  subheader: string;
  buttons: BannerButton[];
};

export function parseBannerCopy(
  content: string | null | undefined,
): BannerCopy {
  if (!content?.trim()) return { header: "", subheader: "" };
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return {
        header: String(parsed.header ?? parsed.title ?? "").trim(),
        subheader: String(parsed.subheader ?? parsed.subtitle ?? "").trim(),
      };
    }
  } catch {
    // ignore non-JSON (e.g. leftover HTML)
  }
  return { header: "", subheader: "" };
}

export function serializeBannerCopy(copy: BannerCopy): string {
  return JSON.stringify({
    header: (copy.header || "").trim(),
    subheader: (copy.subheader || "").trim(),
  });
}

function normalizeSlideButtons(raw: unknown): BannerButton[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const label = String((item as { label?: string }).label || "").trim();
      const href = String((item as { href?: string }).href || "").trim();
      if (!label || !href) return null;
      const variant =
        (item as { variant?: string }).variant === "secondary"
          ? "secondary"
          : "primary";
      return { label, href, variant };
    })
    .filter(Boolean) as BannerButton[];
}

export function parseBannerSlides(
  content: string | null | undefined,
  images: string[] = [],
  buttons: Array<{ label: string; href: string; variant?: string }> = [],
): BannerSlide[] {
  const fallbackCopy = parseBannerCopy(content);
  const sharedButtons = normalizeSlideButtons(buttons);

  if (content?.trim()) {
    try {
      const parsed = JSON.parse(content);
      if (parsed && Array.isArray(parsed.slides)) {
        const slides = parsed.slides
          .map((item: unknown) => {
            if (!item || typeof item !== "object") return null;
            const src = String((item as { src?: string }).src || "").trim();
            if (!src) return null;
            return {
              src,
              header: String(
                (item as { header?: string }).header ?? "",
              ).trim(),
              subheader: String(
                (item as { subheader?: string }).subheader ?? "",
              ).trim(),
              buttons: normalizeSlideButtons(
                (item as { buttons?: unknown }).buttons,
              ),
            } satisfies BannerSlide;
          })
          .filter(Boolean) as BannerSlide[];
        if (slides.length) return slides;
      }
    } catch {
      // fall through to legacy images + shared copy
    }
  }

  return (images || [])
    .map((src) => String(src || "").trim())
    .filter(Boolean)
    .map((src) => ({
      src,
      header: fallbackCopy.header,
      subheader: fallbackCopy.subheader,
      buttons: sharedButtons,
    }));
}

export function serializeBannerSlides(slides: BannerSlide[]): string {
  return JSON.stringify({
    slides: slides
      .map((slide) => ({
        src: (slide.src || "").trim(),
        header: (slide.header || "").trim(),
        subheader: (slide.subheader || "").trim(),
        buttons: normalizeSlideButtons(slide.buttons),
      }))
      .filter((slide) => slide.src),
  });
}
