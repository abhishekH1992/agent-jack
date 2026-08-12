"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { usePagedSearch } from "@/lib/admin-list";
import { uploadAdminFiles } from "@/lib/admin-upload";
import {
  ADMIN_CATALOG_QUERY,
  BELTS_QUERY,
  DELETE_PAGE,
  PAGES_QUERY,
  STORE_BELT,
  STORE_PAGE,
  UPDATE_BELT,
  UPDATE_PAGE,
} from "@/lib/queries";
import {
  AdminPagination,
  AdminSearchBar,
} from "@/components/admin/AdminListControls";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { SortableList } from "@/components/admin/SortableList";
import {
  BeltSourceFields,
  beltInputFromSource,
  beltSourceFromBelt,
  emptyBeltSource,
  type BeltSourceValue,
} from "@/components/admin/BeltSourceFields";
import {
  menuCategoryHref,
  menuSubcategoryHref,
  parseMenuButtonHref,
  type MenuLinkType,
} from "@/lib/menu-links";
import {
  parseMenuBrowseConfig,
  serializeMenuBrowseConfig,
  type MenuBrowseConfig,
} from "@/lib/menu-browse";
import {
  parseBannerCopy,
  serializeBannerCopy,
} from "@/lib/banner-copy";

type BlockType = "IMAGE" | "RICH_TEXT" | "BELT" | "MENU_BROWSE";
type ImageLayout = "SINGLE" | "COLUMN" | "SLIDER";

type BannerButtonForm = {
  id: string;
  label: string;
  href: string;
  variant: "primary" | "secondary";
  linkType: MenuLinkType;
  categoryId: string;
  subCategoryId: string;
};

type BlockForm = {
  id: string;
  type: BlockType;
  sortOrder: number;
  isEnable: boolean;
  images: string[];
  imageLayout: ImageLayout;
  isBanner: boolean;
  buttons: BannerButtonForm[];
  content: string;
  beltId: string;
  belt: BeltSourceValue;
};

type PageForm = {
  title: string;
  slug: string;
  isEnable: boolean;
  blocks: BlockForm[];
};

const emptyBlock = (
  type: BlockType = "RICH_TEXT",
  categories: any[] = [],
): BlockForm => ({
  id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
  type,
  sortOrder: 0,
  isEnable: true,
  images: [],
  imageLayout: "SINGLE",
  isBanner: false,
  buttons: [],
  content:
    type === "MENU_BROWSE"
      ? serializeMenuBrowseConfig({
          catalog: "food",
          showCategory: true,
          showSubcategory: true,
        })
      : "",
  beltId: "",
  belt: emptyBeltSource(categories),
});

const emptyForm = (): PageForm => ({
  title: "",
  slug: "",
  isEnable: true,
  blocks: [],
});

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function MenuBrowseBlockFields({
  value,
  onChange,
}: {
  value: MenuBrowseConfig;
  onChange: (next: MenuBrowseConfig) => void;
}) {
  return (
    <div className="space-y-3">
      <label className="block space-y-1 text-sm">
        <span className="text-[var(--muted)]">Catalog</span>
        <select
          className="input"
          value={value.catalog}
          onChange={(e) =>
            onChange({
              ...value,
              catalog: e.target.value as MenuBrowseConfig["catalog"],
            })
          }
        >
          <option value="food">Food only</option>
          <option value="liquor">Liquor only</option>
          <option value="all">All categories</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.showCategory}
            onChange={(e) =>
              onChange({ ...value, showCategory: e.target.checked })
            }
          />
          Show category
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={value.showSubcategory}
            onChange={(e) =>
              onChange({ ...value, showSubcategory: e.target.checked })
            }
          />
          Show subcategory
        </label>
      </div>
      <p className="text-xs text-[var(--muted)]">
        Only checked rows appear. Menus always show for the current
        selection (or all items if both are off).
      </p>
    </div>
  );
}

export default function AdminPagesPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [belts, setBelts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<PageForm>(emptyForm());
  const [busy, setBusy] = useState(false);

  const getSearchText = useCallback(
    (p: any) => [p.title, p.slug].filter(Boolean).join(" "),
    [],
  );
  const list = usePagedSearch(pages, getSearchText);

  async function load() {
    const [pageData, beltData, catalog] = await Promise.all([
      adminGql<{ pages: any[] }>(PAGES_QUERY),
      adminGql<{ belts: any[] }>(BELTS_QUERY),
      adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY),
    ]);
    setPages(pageData.pages);
    setBelts(beltData.belts);
    setCategories(catalog.categories);
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      toast.error(err.message || "Failed to load pages");
    });
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm());
  }

  function startEdit(page: any) {
    setEditingId(page.id);
    setForm({
      title: page.title || "",
      slug: page.slug || "",
      isEnable: Boolean(page.isEnable),
      blocks: (page.blocks || []).map((b: any, i: number) => ({
        id: b.id || `b-${i}`,
        type: b.type,
        sortOrder: Number(b.sortOrder ?? i),
        isEnable: b.isEnable !== false,
        images: b.images || [],
        imageLayout: (b.imageLayout || "SINGLE") as ImageLayout,
        isBanner: Boolean(b.isBanner),
        buttons: (b.buttons || []).map((btn: any, bi: number) => {
          const parsed = parseMenuButtonHref(btn.href || "");
          const cat =
            categories.find(
              (c) =>
                c.slug === parsed.categorySlug || c.id === parsed.categorySlug,
            ) || null;
          return {
            id: `btn-${b.id || i}-${bi}`,
            label: btn.label || "",
            href: btn.href || "",
            variant: btn.variant === "secondary" ? "secondary" : "primary",
            linkType: parsed.linkType,
            categoryId: cat?.id || "",
            subCategoryId: parsed.subId || "",
          };
        }),
        content:
          b.type === "MENU_BROWSE"
            ? serializeMenuBrowseConfig(parseMenuBrowseConfig(b.content))
            : b.content || "",
        beltId: b.beltId || b.belt?.id || "",
        belt: b.belt
          ? beltSourceFromBelt(b.belt)
          : emptyBeltSource(categories),
      })),
    });
  }

  function updateBlock(id: string, patch: Partial<BlockForm>) {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
    }));
  }

  const allSubCategories = useMemo(
    () =>
      categories.flatMap((c) =>
        (c.subCategories || []).map((s: any) => ({
          ...s,
          categoryId: c.id,
          categorySlug: c.slug,
          categoryName: c.name,
        })),
      ),
    [categories],
  );

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

  function updateButton(
    blockId: string,
    buttonId: string,
    patch: Partial<BannerButtonForm>,
  ) {
    setForm((prev) => ({
      ...prev,
      blocks: prev.blocks.map((block) => {
        if (block.id !== blockId) return block;
        return {
          ...block,
          buttons: block.buttons.map((btn) => {
            if (btn.id !== buttonId) return btn;
            const next = { ...btn, ...patch };
            // Keep label in sync when picking category/sub unless admin typed custom
            if (patch.categoryId && next.linkType === "category") {
              const cat = categories.find((c) => c.id === patch.categoryId);
              if (cat && (!btn.label || btn.label === categories.find((c) => c.id === btn.categoryId)?.name)) {
                next.label = cat.name;
              }
            }
            if (patch.subCategoryId && next.linkType === "subcategory") {
              const sub = allSubCategories.find(
                (s) => s.id === patch.subCategoryId,
              );
              const prevSub = allSubCategories.find(
                (s) => s.id === btn.subCategoryId,
              );
              if (sub && (!btn.label || btn.label === prevSub?.name)) {
                next.label = sub.name;
              }
              if (sub) next.categoryId = sub.categoryId;
            }
            next.href = buildButtonHref(next);
            return next;
          }),
        };
      }),
    }));
  }

  function selectExistingBelt(blockId: string, beltId: string) {
    const belt = belts.find((b) => b.id === beltId);
    updateBlock(blockId, {
      beltId,
      belt: belt ? beltSourceFromBelt(belt) : emptyBeltSource(categories),
    });
  }

  async function upsertBeltForBlock(block: BlockForm, sortOrder: number) {
    if (!block.belt.name.trim()) {
      throw new Error("Belt blocks need a name");
    }
    if (block.belt.sourceType === "CATEGORY" && !block.belt.categoryId) {
      throw new Error("Select a category for the belt");
    }
    if (block.belt.sourceType === "SUBCATEGORY" && !block.belt.subCategoryId) {
      throw new Error("Select a subcategory for the belt");
    }
    if (block.belt.sourceType === "MENUS" && block.belt.menuIds.length === 0) {
      throw new Error("Handpick at least one menu item");
    }

    const input = beltInputFromSource(block.belt, sortOrder);
    if (block.beltId) {
      const data = await adminGql<{ updateBelt: any }>(UPDATE_BELT, {
        id: block.beltId,
        input,
      });
      return data.updateBelt.id as string;
    }
    const data = await adminGql<{ storeBelt: any }>(STORE_BELT, { input });
    return data.storeBelt.id as string;
  }

  async function save() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setBusy(true);
    try {
      const blocks = [];
      for (let i = 0; i < form.blocks.length; i++) {
        const b = form.blocks[i];
        let beltId = b.beltId || null;
        if (b.type === "BELT") {
          beltId = await upsertBeltForBlock(b, i);
        }
        blocks.push({
          type: b.type,
          sortOrder: i,
          isEnable: b.isEnable,
          images: b.type === "IMAGE" ? b.images : [],
          imageLayout: b.type === "IMAGE" ? b.imageLayout : null,
          isBanner: b.type === "IMAGE" ? b.isBanner : false,
          buttons:
            b.type === "IMAGE"
              ? b.buttons
                  .filter((btn) => btn.label.trim() && btn.href.trim())
                  .map((btn) => ({
                    label: btn.label.trim(),
                    href: btn.href.trim(),
                    variant: btn.variant,
                  }))
              : [],
          content:
            b.type === "RICH_TEXT" || b.type === "MENU_BROWSE"
              ? b.content
              : b.type === "IMAGE" && b.isBanner
                ? serializeBannerCopy(parseBannerCopy(b.content))
                : null,
          beltId: b.type === "BELT" ? beltId : null,
        });
      }

      const input = {
        title: form.title.trim(),
        slug: form.slug.trim() || slugify(form.title),
        isEnable: form.isEnable,
        blocks,
      };
      if (editingId) {
        await adminGql(UPDATE_PAGE, { id: editingId, input });
        toast.success("Page updated");
      } else {
        await adminGql(STORE_PAGE, { input });
        toast.success("Page created");
      }
      startCreate();
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this page?")) return;
    try {
      await adminGql(DELETE_PAGE, { id });
      toast.success("Deleted");
      if (editingId === id) startCreate();
      await load();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  const previewSlug = useMemo(
    () => form.slug.trim() || slugify(form.title) || "…",
    [form.slug, form.title],
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Pages
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Drag blocks to reorder. Belt blocks pick a category, subcategory, or
            handpicked menus.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-secondary !rounded-xl"
          onClick={startCreate}
        >
          New page
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]">
        <section className="space-y-3">
          <AdminSearchBar
            value={list.query}
            onChange={list.setQuery}
            placeholder="Search pages…"
          />
          <div className="space-y-2">
            {list.pageItems.map((page) => (
              <div
                key={page.id}
                className="surface-card flex items-start justify-between gap-3 rounded-2xl p-4"
              >
                <div className="min-w-0">
                  <div className="font-semibold">{page.title}</div>
                  <div className="text-xs text-[var(--muted)]">
                    /{page.slug} · {page.blocks?.length || 0} blocks
                    {!page.isEnable ? " · disabled" : ""}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    className="btn btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
                    onClick={() => startEdit(page)}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
                    onClick={() => remove(page.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {list.total === 0 ? (
              <p className="text-sm text-[var(--muted)]">No pages yet.</p>
            ) : null}
          </div>
          <AdminPagination
            page={list.page}
            totalPages={list.totalPages}
            total={list.total}
            onPageChange={list.setPage}
          />
        </section>

        <section className="surface-card space-y-4 rounded-2xl p-4 md:p-5">
          <h2 className="font-semibold">
            {editingId ? "Edit page" : "Create page"}
          </h2>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted)]">Title</span>
            <input
              className="input"
              value={form.title}
              onChange={(e) => {
                const title = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  title,
                  slug: prev.slug || slugify(title),
                }));
              }}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="text-[var(--muted)]">Slug</span>
            <input
              className="input"
              value={form.slug}
              onChange={(e) =>
                setForm({ ...form, slug: slugify(e.target.value) })
              }
            />
            <span className="text-xs text-[var(--muted)]">
              URL preview: /{previewSlug === "home" ? "" : previewSlug}
            </span>
          </label>
          <label className="inline-flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.isEnable}
              onChange={(e) =>
                setForm({ ...form, isEnable: e.target.checked })
              }
            />
            Enabled
          </label>

          <div className="space-y-3 border-t border-[var(--line)] pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Blocks</h3>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ["IMAGE", "Image"],
                    ["RICH_TEXT", "Rich text"],
                    ["BELT", "Belt"],
                    ["MENU_BROWSE", "Menu browse"],
                  ] as const
                ).map(([type, label]) => (
                  <button
                    key={type}
                    type="button"
                    className="btn btn-secondary !min-h-9 !rounded-lg !px-3 !py-1.5 text-xs"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        blocks: [
                          ...prev.blocks,
                          {
                            ...emptyBlock(type, categories),
                            sortOrder: prev.blocks.length,
                          },
                        ],
                      }))
                    }
                  >
                    + {label}
                  </button>
                ))}
              </div>
            </div>

            <SortableList
              items={form.blocks}
              onReorder={(blocks) =>
                setForm((prev) => ({
                  ...prev,
                  blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
                }))
              }
              renderItem={(block, handle) => (
                <div className="space-y-3 rounded-xl border border-[var(--line)] bg-[var(--page)] p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {handle}
                      <div className="text-sm font-semibold">
                        {block.type.replace("_", " ")}
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn btn-danger !min-h-8 !rounded-lg !px-2 !py-1 text-xs"
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          blocks: prev.blocks.filter((b) => b.id !== block.id),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <label className="inline-flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={block.isEnable}
                      onChange={(e) =>
                        updateBlock(block.id, { isEnable: e.target.checked })
                      }
                    />
                    Enabled
                  </label>

                  {block.type === "IMAGE" ? (
                    <>
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--muted)]">Layout</span>
                        <select
                          className="input"
                          value={block.imageLayout}
                          onChange={(e) =>
                            updateBlock(block.id, {
                              imageLayout: e.target.value as ImageLayout,
                            })
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
                          checked={block.isBanner}
                          onChange={(e) => {
                            const isBanner = e.target.checked;
                            updateBlock(block.id, {
                              isBanner,
                              imageLayout: isBanner
                                ? "SLIDER"
                                : block.imageLayout,
                              content: isBanner
                                ? serializeBannerCopy(
                                    parseBannerCopy(block.content),
                                  )
                                : block.content,
                            });
                          }}
                        />
                        Is banner (full-bleed hero slider)
                      </label>
                      {block.isBanner ? (
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="block space-y-1 text-sm sm:col-span-2">
                            <span className="text-[var(--muted)]">
                              Header (optional)
                            </span>
                            <input
                              className="input"
                              placeholder="e.g. Bid · Order · Feast"
                              value={parseBannerCopy(block.content).header}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  content: serializeBannerCopy({
                                    ...parseBannerCopy(block.content),
                                    header: e.target.value,
                                  }),
                                })
                              }
                            />
                          </label>
                          <label className="block space-y-1 text-sm sm:col-span-2">
                            <span className="text-[var(--muted)]">
                              Subheader (optional)
                            </span>
                            <input
                              className="input"
                              placeholder="e.g. Live liquor prices from your table"
                              value={parseBannerCopy(block.content).subheader}
                              onChange={(e) =>
                                updateBlock(block.id, {
                                  content: serializeBannerCopy({
                                    ...parseBannerCopy(block.content),
                                    subheader: e.target.value,
                                  }),
                                })
                              }
                            />
                          </label>
                        </div>
                      ) : null}
                      <ImageUploadField
                        value=""
                        folder="banners"
                        onChange={() => undefined}
                        multiple
                        onFiles={async (files) => {
                          try {
                            const urls = await uploadAdminFiles(
                              files,
                              "banners",
                            );
                            updateBlock(block.id, {
                              images: [...block.images, ...urls],
                            });
                          } catch (err: any) {
                            toast.error(err.message || "Upload failed");
                          }
                        }}
                      />
                      {block.images.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {block.images.map((src) => (
                            <div key={src} className="relative">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={src}
                                alt=""
                                className="h-16 w-24 rounded-lg object-cover"
                              />
                              <button
                                type="button"
                                className="absolute -right-1 -top-1 rounded-full bg-white px-1.5 text-xs shadow"
                                onClick={() =>
                                  updateBlock(block.id, {
                                    images: block.images.filter(
                                      (x) => x !== src,
                                    ),
                                  })
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-2 rounded-xl border border-[var(--line)] bg-white p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold">
                            Buttons / links
                          </span>
                          <button
                            type="button"
                            className="btn btn-secondary !min-h-8 !rounded-lg !px-2 !py-1 text-xs"
                            onClick={() =>
                              updateBlock(block.id, {
                                buttons: [
                                  ...block.buttons,
                                  {
                                    id: `btn-${Date.now()}`,
                                    label: "",
                                    href: "",
                                    variant: "primary",
                                    linkType: "subcategory",
                                    categoryId: "",
                                    subCategoryId: "",
                                  },
                                ],
                              })
                            }
                          >
                            + Button
                          </button>
                        </div>
                        {block.buttons.length === 0 ? (
                          <p className="text-xs text-[var(--muted)]">
                            Link to a category or subcategory on /menu, or a
                            custom URL.
                          </p>
                        ) : null}
                        {block.buttons.map((btn) => (
                          <div
                            key={btn.id}
                            className="space-y-2 rounded-lg border border-[var(--line)] p-2"
                          >
                            <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                              <input
                                className="input !min-h-10"
                                placeholder="Label"
                                value={btn.label}
                                onChange={(e) =>
                                  updateButton(block.id, btn.id, {
                                    label: e.target.value,
                                  })
                                }
                              />
                              <select
                                className="input !min-h-10"
                                value={btn.variant}
                                onChange={(e) =>
                                  updateButton(block.id, btn.id, {
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
                                  updateBlock(block.id, {
                                    buttons: block.buttons.filter(
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
                                updateButton(block.id, btn.id, {
                                  linkType: e.target.value as MenuLinkType,
                                  href:
                                    e.target.value === "custom" ? btn.href : "",
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
                                  updateButton(block.id, btn.id, {
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
                                  updateButton(block.id, btn.id, {
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
                                  updateButton(block.id, btn.id, {
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
                    </>
                  ) : null}

                  {block.type === "RICH_TEXT" ? (
                    <label className="block space-y-1 text-sm">
                      <span className="text-[var(--muted)]">HTML content</span>
                      <textarea
                        className="input min-h-40 font-mono text-sm"
                        value={block.content}
                        onChange={(e) =>
                          updateBlock(block.id, { content: e.target.value })
                        }
                        placeholder="<p>Your content…</p>"
                      />
                    </label>
                  ) : null}

                  {block.type === "MENU_BROWSE" ? (
                    <MenuBrowseBlockFields
                      value={parseMenuBrowseConfig(block.content)}
                      onChange={(next) =>
                        updateBlock(block.id, {
                          content: serializeMenuBrowseConfig(next),
                        })
                      }
                    />
                  ) : null}

                  {block.type === "BELT" ? (
                    <div className="space-y-3">
                      <label className="block space-y-1 text-sm">
                        <span className="text-[var(--muted)]">
                          Start from existing belt (optional)
                        </span>
                        <select
                          className="input"
                          value={block.beltId}
                          onChange={(e) =>
                            selectExistingBelt(block.id, e.target.value)
                          }
                        >
                          <option value="">Create new / configure below</option>
                          {belts.map((belt) => (
                            <option key={belt.id} value={belt.id}>
                              {belt.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <BeltSourceFields
                        value={block.belt}
                        categories={categories}
                        onChange={(belt) => updateBlock(block.id, { belt })}
                      />
                    </div>
                  ) : null}
                </div>
              )}
            />
          </div>

          <button
            type="button"
            className="btn btn-primary w-full !rounded-xl"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : editingId ? "Update page" : "Create page"}
          </button>
        </section>
      </div>
    </div>
  );
}
