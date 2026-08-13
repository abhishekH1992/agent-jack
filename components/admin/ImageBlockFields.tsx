"use client";

import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { SortableList } from "@/components/admin/SortableList";
import { uploadAdminFiles } from "@/lib/admin-upload";
import type { BannerSlide } from "@/lib/banner-copy";
import { IMAGE_SIZE_HINTS } from "@/lib/image-sizes";
import {
  menuCategoryHref,
  menuSubcategoryHref,
  parseMenuButtonHref,
  type MenuLinkType,
} from "@/lib/menu-links";

export type ImageLayout = "SINGLE" | "COLUMN" | "SLIDER";

export type BannerButtonForm = {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary";
  linkType: MenuLinkType;
  categoryId: string;
  subCategoryId: string;
};

export type BannerSlideForm = {
  id: string;
  src: string;
  header: string;
  subheader: string;
  buttons: BannerButtonForm[];
};

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyButton(id?: string): BannerButtonForm {
  return {
    id: id || newId("btn"),
    label: "",
    href: "",
    variant: "primary",
    linkType: "subcategory",
    categoryId: "",
    subCategoryId: "",
  };
}

export function emptySlide(src = ""): BannerSlideForm {
  return {
    id: newId("slide"),
    src,
    header: "",
    subheader: "",
    buttons: [emptyButton()],
  };
}

export function buttonFormFromApi(
  btn: { label?: string; href?: string; variant?: string } | undefined,
  categories: any[],
  id?: string,
): BannerButtonForm {
  const href = btn?.href || "";
  const parsed = parseMenuButtonHref(href);
  const cat =
    categories.find(
      (c) => c.slug === parsed.categorySlug || c.id === parsed.categorySlug,
    ) || null;
  return {
    id: id || newId("btn"),
    label: btn?.label || "",
    href,
    variant: btn?.variant === "secondary" ? "secondary" : "primary",
    linkType: parsed.linkType,
    categoryId: cat?.id || "",
    subCategoryId: parsed.subId || "",
  };
}

export function slidesFromApi(
  slides: BannerSlide[] | undefined,
  images: string[] | undefined,
  categories: any[],
): BannerSlideForm[] {
  const list =
    slides && slides.length
      ? slides
      : (images || []).map((src) => ({
          src,
          header: "",
          subheader: "",
          buttons: [],
        }));
  return list.map((slide, i) => ({
    id: newId(`slide-${i}`),
    src: slide.src,
    header: slide.header || "",
    subheader: slide.subheader || "",
    buttons: (slide.buttons?.length ? slide.buttons : [undefined]).map((btn) =>
      buttonFormFromApi(btn, categories),
    ),
  }));
}

export function slideToInput(slide: BannerSlideForm) {
  return {
    src: slide.src,
    header: slide.header.trim(),
    subheader: slide.subheader.trim(),
    buttons: slide.buttons
      .filter((btn) => btn.label.trim() && btn.href.trim())
      .map((btn) => ({
        label: btn.label.trim(),
        href: btn.href.trim(),
        variant: btn.variant,
      })),
  };
}

type CatalogSub = {
  id: string;
  name: string;
  categoryId: string;
  categorySlug: string;
  categoryName: string;
};

export function ImageBlockFields({
  blockId,
  imageLayout,
  isBanner,
  slides,
  categories,
  allSubCategories,
  onChange,
}: {
  blockId: string;
  imageLayout: ImageLayout;
  isBanner: boolean;
  slides: BannerSlideForm[];
  categories: any[];
  allSubCategories: CatalogSub[];
  onChange: (patch: {
    imageLayout?: ImageLayout;
    isBanner?: boolean;
    slides?: BannerSlideForm[];
  }) => void;
}) {
  function buildButtonHref(btn: BannerButtonForm): string {
    if (btn.linkType === "category") {
      const cat = categories.find((c) => c.id === btn.categoryId);
      return cat ? menuCategoryHref(cat.slug) : "/menu";
    }
    if (btn.linkType === "subcategory") {
      const sub = allSubCategories.find((s) => s.id === btn.subCategoryId);
      if (!sub) return "/menu";
      return menuSubcategoryHref(sub.categorySlug, sub.id);
    }
    return btn.href;
  }

  function patchSlide(slideId: string, patch: Partial<BannerSlideForm>) {
    onChange({
      slides: slides.map((slide) =>
        slide.id === slideId ? { ...slide, ...patch } : slide,
      ),
    });
  }

  function patchButton(
    slide: BannerSlideForm,
    buttonId: string,
    patch: Partial<BannerButtonForm>,
  ) {
    const current = slide.buttons.find((btn) => btn.id === buttonId);
    if (!current) return;
    const next = { ...current, ...patch };
    if (patch.categoryId && next.linkType === "category") {
      const cat = categories.find((c) => c.id === patch.categoryId);
      const prevCat = categories.find((c) => c.id === current.categoryId);
      if (cat && (!current.label || current.label === prevCat?.name)) {
        next.label = cat.name;
      }
    }
    if (patch.subCategoryId && next.linkType === "subcategory") {
      const sub = allSubCategories.find((s) => s.id === patch.subCategoryId);
      const prevSub = allSubCategories.find(
        (s) => s.id === current.subCategoryId,
      );
      if (sub && (!current.label || current.label === prevSub?.name)) {
        next.label = sub.name;
      }
      if (sub) next.categoryId = sub.categoryId;
    }
    next.href = buildButtonHref(next);
    patchSlide(slide.id, {
      buttons: slide.buttons.map((btn) => (btn.id === buttonId ? next : btn)),
    });
  }

  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--muted)]">Layout</span>
        <select
          className="input"
          value={imageLayout}
          onChange={(e) =>
            onChange({ imageLayout: e.target.value as ImageLayout })
          }
        >
          <option value="SINGLE">Single full width</option>
          <option value="COLUMN">Column (multi)</option>
          <option value="SLIDER">Slider (multi)</option>
        </select>
      </label>
      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={isBanner}
          onChange={(e) => {
            const next = e.target.checked;
            onChange({
              isBanner: next,
              imageLayout: next ? "SLIDER" : imageLayout,
            });
          }}
        />
        Is banner (full-bleed hero slider)
      </label>

      <div className="space-y-3">
        <ImageUploadField
          label={isBanner ? "Banner slides" : "Images"}
          value=""
          folder="banners"
          showPreview={false}
          hint={isBanner ? IMAGE_SIZE_HINTS.banner : IMAGE_SIZE_HINTS.page}
          onChange={() => undefined}
          onFiles={async (files) => {
            const file = files[0];
            if (!file) return;
            const urls = await uploadAdminFiles([file], "banners");
            const src = urls[0];
            if (!src) return;
            onChange({ slides: [...slides, emptySlide(src)] });
          }}
        />
        <p className="text-xs text-[var(--muted)]">
          Upload one image at a time. Drag the handle to change order.
        </p>

        {slides.length > 0 ? (
          <SortableList
            id={`slides-${blockId}`}
            items={slides}
            onReorder={(next) => onChange({ slides: next })}
            renderItem={(slide, handle) => (
              <div className="space-y-3 rounded-xl border border-[var(--line)] bg-white p-3">
                <div className="flex items-start gap-3">
                  {handle}
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="flex items-start gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={slide.src}
                        alt=""
                        className="h-16 w-24 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <ImageUploadField
                          label="Replace image"
                          value={slide.src}
                          folder="banners"
                          showPreview={false}
                          allowClear={false}
                          onChange={(url) =>
                            patchSlide(slide.id, { src: url })
                          }
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-danger !min-h-9 !rounded-lg !px-3 text-xs"
                        onClick={() =>
                          onChange({
                            slides: slides.filter((s) => s.id !== slide.id),
                          })
                        }
                      >
                        Remove
                      </button>
                    </div>

                    {isBanner ? (
                      <div className="grid gap-2">
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--muted)]">Header</span>
                          <input
                            className="input"
                            placeholder="e.g. Bid · Order · Feast"
                            value={slide.header}
                            onChange={(e) =>
                              patchSlide(slide.id, { header: e.target.value })
                            }
                          />
                        </label>
                        <label className="block space-y-1 text-sm">
                          <span className="text-[var(--muted)]">
                            Subheader
                          </span>
                          <input
                            className="input"
                            placeholder="e.g. Live liquor prices from your table"
                            value={slide.subheader}
                            onChange={(e) =>
                              patchSlide(slide.id, {
                                subheader: e.target.value,
                              })
                            }
                          />
                        </label>
                        <div className="space-y-2 rounded-lg border border-[var(--line)] p-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                              Button / link
                            </span>
                            <button
                              type="button"
                              className="btn btn-secondary !min-h-8 !rounded-lg !px-2 !py-1 text-xs"
                              onClick={() =>
                                patchSlide(slide.id, {
                                  buttons: [...slide.buttons, emptyButton()],
                                })
                              }
                            >
                              + Button
                            </button>
                          </div>
                          {slide.buttons.map((btn) => (
                            <div
                              key={btn.id}
                              className="space-y-2 rounded-lg border border-[var(--line)] p-2"
                            >
                              <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                                <input
                                  className="input !min-h-10"
                                  placeholder="Button label (optional)"
                                  value={btn.label}
                                  onChange={(e) =>
                                    patchButton(slide, btn.id, {
                                      label: e.target.value,
                                    })
                                  }
                                />
                                <select
                                  className="input !min-h-10"
                                  value={btn.variant}
                                  onChange={(e) =>
                                    patchButton(slide, btn.id, {
                                      variant: e.target.value as
                                        | "primary"
                                        | "secondary",
                                    })
                                  }
                                >
                                  <option value="primary">Primary</option>
                                  <option value="secondary">Secondary</option>
                                </select>
                                <button
                                  type="button"
                                  className="btn btn-danger !min-h-10 !rounded-lg !px-3 text-xs"
                                  onClick={() =>
                                    patchSlide(slide.id, {
                                      buttons: slide.buttons.filter(
                                        (x) => x.id !== btn.id,
                                      ),
                                    })
                                  }
                                >
                                  ×
                                </button>
                              </div>
                              <select
                                className="input !min-h-10"
                                value={btn.linkType}
                                onChange={(e) =>
                                  patchButton(slide, btn.id, {
                                    linkType: e.target.value as MenuLinkType,
                                    href:
                                      e.target.value === "custom"
                                        ? btn.href
                                        : "",
                                  })
                                }
                              >
                                <option value="subcategory">
                                  Menu subcategory
                                </option>
                                <option value="category">Menu category</option>
                                <option value="custom">Custom URL</option>
                              </select>
                              {btn.linkType === "category" ? (
                                <select
                                  className="input !min-h-10"
                                  value={btn.categoryId}
                                  onChange={(e) =>
                                    patchButton(slide, btn.id, {
                                      categoryId: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Select category…</option>
                                  {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.name}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                              {btn.linkType === "subcategory" ? (
                                <select
                                  className="input !min-h-10"
                                  value={btn.subCategoryId}
                                  onChange={(e) =>
                                    patchButton(slide, btn.id, {
                                      subCategoryId: e.target.value,
                                    })
                                  }
                                >
                                  <option value="">Select subcategory…</option>
                                  {allSubCategories.map((s) => (
                                    <option key={s.id} value={s.id}>
                                      {s.categoryName} · {s.name}
                                    </option>
                                  ))}
                                </select>
                              ) : null}
                              {btn.linkType === "custom" ? (
                                <input
                                  className="input !min-h-10"
                                  placeholder="/menu or https://…"
                                  value={btn.href}
                                  onChange={(e) =>
                                    patchButton(slide, btn.id, {
                                      href: e.target.value,
                                    })
                                  }
                                />
                              ) : (
                                <p className="text-xs text-[var(--muted)]">
                                  Opens: {btn.href || "—"}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}
          />
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--muted)]">
            No images yet
          </p>
        )}
      </div>
    </>
  );
}
