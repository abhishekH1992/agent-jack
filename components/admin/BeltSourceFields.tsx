"use client";

export type BeltSourceType = "CATEGORY" | "SUBCATEGORY" | "MENUS";

export type BeltSourceValue = {
  name: string;
  sourceType: BeltSourceType;
  categoryId: string;
  subCategoryId: string;
  menuIds: string[];
  isSlider: boolean;
};

export function BeltSourceFields({
  value,
  onChange,
  categories,
  showName = true,
}: {
  value: BeltSourceValue;
  onChange: (next: BeltSourceValue) => void;
  categories: any[];
  showName?: boolean;
}) {
  const subCategories = categories.flatMap((c) =>
    (c.subCategories || []).map((s: any) => ({
      ...s,
      categoryName: c.name,
    })),
  );
  const allMenus = categories.flatMap((c) =>
    (c.subCategories || []).flatMap((s: any) =>
      (s.menus || []).map((m: any) => ({
        ...m,
        label: `${c.name} · ${s.name} · ${m.name}`,
      })),
    ),
  );

  function patch(partial: Partial<BeltSourceValue>) {
    onChange({ ...value, ...partial });
  }

  function toggleMenu(id: string) {
    patch({
      menuIds: value.menuIds.includes(id)
        ? value.menuIds.filter((x) => x !== id)
        : [...value.menuIds, id],
    });
  }

  return (
    <div className="space-y-3">
      {showName ? (
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Belt name</span>
          <input
            className="input"
            value={value.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="e.g. Burgers"
          />
        </label>
      ) : null}

      <label className="block space-y-1 text-sm">
        <span className="text-[var(--muted)]">Source</span>
        <select
          className="input"
          value={value.sourceType}
          onChange={(e) =>
            patch({ sourceType: e.target.value as BeltSourceType })
          }
        >
          <option value="CATEGORY">Category</option>
          <option value="SUBCATEGORY">Subcategory</option>
          <option value="MENUS">Handpick menu items</option>
        </select>
      </label>

      {value.sourceType === "CATEGORY" ? (
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Category</span>
          <select
            className="input"
            value={value.categoryId}
            onChange={(e) => patch({ categoryId: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {value.sourceType === "SUBCATEGORY" ? (
        <label className="block space-y-1 text-sm">
          <span className="text-[var(--muted)]">Subcategory</span>
          <select
            className="input"
            value={value.subCategoryId}
            onChange={(e) => patch({ subCategoryId: e.target.value })}
          >
            <option value="">Select subcategory</option>
            {subCategories.map((s) => (
              <option key={s.id} value={s.id}>
                {s.categoryName} · {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {value.sourceType === "MENUS" ? (
        <div className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Menu items
          </span>
          <div className="max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[var(--line)] bg-white p-2">
            {allMenus.map((m) => (
              <label
                key={m.id}
                className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-[var(--brand-soft)]"
              >
                <input
                  type="checkbox"
                  checked={value.menuIds.includes(m.id)}
                  onChange={() => toggleMenu(m.id)}
                  className="accent-[var(--brand)]"
                />
                <span className="min-w-0 truncate">{m.label}</span>
              </label>
            ))}
            {allMenus.length === 0 ? (
              <p className="px-2 py-3 text-sm text-[var(--muted)]">
                No menus available.
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      <label className="inline-flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={value.isSlider}
          onChange={(e) => patch({ isSlider: e.target.checked })}
        />
        Slider layout (unchecked = grid)
      </label>
    </div>
  );
}

export function emptyBeltSource(categories: any[] = []): BeltSourceValue {
  return {
    name: "",
    sourceType: "CATEGORY",
    categoryId: categories[0]?.id || "",
    subCategoryId: "",
    menuIds: [],
    isSlider: false,
  };
}

export function beltSourceFromBelt(belt: any): BeltSourceValue {
  return {
    name: belt?.name || "",
    sourceType: belt?.sourceType || "CATEGORY",
    categoryId: belt?.categoryId || "",
    subCategoryId: belt?.subCategoryId || "",
    menuIds: (belt?.items || []).map((i: any) => i.menu?.id || i.menuId).filter(Boolean),
    isSlider: Boolean(belt?.isSlider),
  };
}

export function beltInputFromSource(source: BeltSourceValue, sortOrder = 0) {
  return {
    name: source.name.trim(),
    sourceType: source.sourceType,
    categoryId:
      source.sourceType === "CATEGORY" ? source.categoryId || null : null,
    subCategoryId:
      source.sourceType === "SUBCATEGORY" ? source.subCategoryId || null : null,
    menuIds: source.sourceType === "MENUS" ? source.menuIds : [],
    isSlider: source.isSlider,
    isEnable: true,
    sortOrder,
  };
}
