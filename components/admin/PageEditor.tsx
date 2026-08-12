"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  BELTS_QUERY,
  PAGE_QUERY,
  STORE_BELT,
  STORE_PAGE,
  UPDATE_BELT,
  UPDATE_PAGE,
} from "@/lib/queries";
import {
  ImageBlockFields,
  slidesFromApi,
  slideToInput,
  type BannerSlideForm,
  type ImageLayout,
} from "@/components/admin/ImageBlockFields";
import { SortableList } from "@/components/admin/SortableList";
import {
  BeltSourceFields,
  beltInputFromSource,
  beltSourceFromBelt,
  emptyBeltSource,
  type BeltSourceValue,
} from "@/components/admin/BeltSourceFields";
import {
  parseMenuBrowseConfig,
  serializeMenuBrowseConfig,
  type MenuBrowseConfig,
} from "@/lib/menu-browse";

type BlockType = "IMAGE" | "RICH_TEXT" | "BELT" | "MENU_BROWSE";

type BlockForm = {
  id: string;
  type: BlockType;
  sortOrder: number;
  isEnable: boolean;
  slides: BannerSlideForm[];
  imageLayout: ImageLayout;
  isBanner: boolean;
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
  slides: [],
  imageLayout: "SINGLE",
  isBanner: false,
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

function formFromPage(page: any, categories: any[]): PageForm {
  return {
    title: page.title || "",
    slug: page.slug || "",
    isEnable: Boolean(page.isEnable),
    blocks: (page.blocks || []).map((b: any, i: number) => ({
      id: b.id || `b-${i}`,
      type: b.type,
      sortOrder: Number(b.sortOrder ?? i),
      isEnable: b.isEnable !== false,
      slides: slidesFromApi(b.slides, b.images, categories),
      imageLayout: (b.imageLayout || "SINGLE") as ImageLayout,
      isBanner: Boolean(b.isBanner),
      content:
        b.type === "MENU_BROWSE"
          ? serializeMenuBrowseConfig(parseMenuBrowseConfig(b.content))
          : b.content || "",
      beltId: b.beltId || b.belt?.id || "",
      belt: b.belt
        ? beltSourceFromBelt(b.belt)
        : emptyBeltSource(categories),
    })),
  };
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

export function PageEditor({ pageId }: { pageId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(pageId);
  const [belts, setBelts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState<PageForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const [beltData, catalog, pageData] = await Promise.all([
          adminGql<{ belts: any[] }>(BELTS_QUERY),
          adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY),
          pageId
            ? adminGql<{ page: any }>(PAGE_QUERY, { id: pageId })
            : Promise.resolve({ page: null }),
        ]);
        if (cancelled) return;
        setBelts(beltData.belts);
        setCategories(catalog.categories);
        if (pageId) {
          if (!pageData.page) {
            setNotFound(true);
            setForm(emptyForm());
          } else {
            setForm(formFromPage(pageData.page, catalog.categories));
          }
        } else {
          setForm(emptyForm());
        }
      } catch (err: any) {
        if (!cancelled) {
          toast.error(err.message || "Failed to load page");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [pageId]);

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
        const slides =
          b.type === "IMAGE"
            ? b.slides.filter((s) => s.src.trim()).map(slideToInput)
            : [];
        blocks.push({
          type: b.type,
          sortOrder: i,
          isEnable: b.isEnable,
          images: slides.map((s) => s.src),
          imageLayout: b.type === "IMAGE" ? b.imageLayout : null,
          isBanner: b.type === "IMAGE" ? b.isBanner : false,
          slides,
          buttons: [],
          content:
            b.type === "RICH_TEXT" || b.type === "MENU_BROWSE"
              ? b.content
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
      if (pageId) {
        await adminGql(UPDATE_PAGE, { id: pageId, input });
        toast.success("Page updated");
      } else {
        await adminGql(STORE_PAGE, { input });
        toast.success("Page created");
      }
      router.push("/admin/pages");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  const previewSlug = useMemo(
    () => form.slug.trim() || slugify(form.title) || "…",
    [form.slug, form.title],
  );

  if (loading) {
    return <div className="text-sm text-[var(--muted)]">Loading page…</div>;
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Page not found.</p>
        <Link href="/admin/pages" className="btn btn-secondary !rounded-xl">
          Back to pages
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/pages"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Pages
        </Link>
        <h1
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {isEdit ? "Edit page" : "New page"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Drag blocks to reorder. Banner slides have their own header,
          subheader, and button — drag those too.
        </p>
      </div>

      <section className="surface-card space-y-4 rounded-2xl p-4 md:p-6">
        <div className="grid gap-4 md:grid-cols-2">
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
        </div>
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
            id="page-blocks"
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
                  <ImageBlockFields
                    blockId={block.id}
                    imageLayout={block.imageLayout}
                    isBanner={block.isBanner}
                    slides={block.slides}
                    categories={categories}
                    allSubCategories={allSubCategories}
                    onChange={(patch) => updateBlock(block.id, patch)}
                  />
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

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="btn btn-primary !rounded-xl"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : isEdit ? "Update page" : "Create page"}
          </button>
          <Link href="/admin/pages" className="btn btn-secondary !rounded-xl">
            Cancel
          </Link>
        </div>
      </section>
    </div>
  );
}
