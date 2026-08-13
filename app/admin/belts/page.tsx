"use client";

import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  BELTS_QUERY,
  DELETE_BELT,
  STORE_BELT,
  UPDATE_BELT,
} from "@/lib/queries";
import { AdminSearchBar } from "@/components/admin/AdminListControls";
import { SortableList } from "@/components/admin/SortableList";
import {
  BeltSourceFields,
  beltInputFromSource,
  beltSourceFromBelt,
  emptyBeltSource,
  type BeltSourceValue,
} from "@/components/admin/BeltSourceFields";

type BeltForm = BeltSourceValue & { isEnable: boolean };

function emptyForm(categories: any[] = []): BeltForm {
  return { ...emptyBeltSource(categories), isEnable: true };
}

export default function AdminBeltsPage() {
  const [belts, setBelts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<BeltForm>(emptyForm());
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...belts].sort(
      (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
    );
    if (!q) return sorted;
    return sorted.filter((belt) => {
      const source =
        belt.sourceType === "CATEGORY"
          ? belt.category?.name
          : belt.sourceType === "SUBCATEGORY"
            ? belt.subCategory?.name
            : "handpicked";
      return [belt.name, belt.sourceType, source]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [belts, query]);

  async function load() {
    const [beltData, catalog] = await Promise.all([
      adminGql<{ belts: any[] }>(BELTS_QUERY),
      adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY),
    ]);
    setBelts(beltData.belts);
    setCategories(catalog.categories);
  }

  useEffect(() => {
    load().catch((err) => {
      console.error(err);
      toast.error(err.message || "Failed to load belts");
    });
  }, []);

  function startCreate() {
    setEditingId(null);
    setForm(emptyForm(categories));
  }

  function startEdit(belt: any) {
    setEditingId(belt.id);
    setForm({ ...beltSourceFromBelt(belt), isEnable: Boolean(belt.isEnable) });
  }

  async function persistOrder(next: any[]) {
    const previous = belts;
    setBelts(next.map((b, i) => ({ ...b, sortOrder: i })));
    try {
      await Promise.all(
        next.map((belt, index) =>
          adminGql(UPDATE_BELT, {
            id: belt.id,
            input: {
              name: belt.name,
              sourceType: belt.sourceType,
              categoryId: belt.categoryId,
              subCategoryId: belt.subCategoryId,
              menuIds: (belt.items || []).map((i: any) => i.menu?.id).filter(Boolean),
              isSlider: Boolean(belt.isSlider),
              isEnable: Boolean(belt.isEnable),
              sortOrder: index,
            },
          }),
        ),
      );
    } catch (err: any) {
      setBelts(previous);
      toast.error(err.message || "Failed to reorder");
    }
  }

  async function save() {
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (form.sourceType === "CATEGORY" && !form.categoryId) {
      toast.error("Select a category");
      return;
    }
    if (form.sourceType === "SUBCATEGORY" && !form.subCategoryId) {
      toast.error("Select a subcategory");
      return;
    }
    if (form.sourceType === "MENUS" && form.menuIds.length === 0) {
      toast.error("Handpick at least one menu item");
      return;
    }

    setBusy(true);
    try {
      const input = {
        ...beltInputFromSource(form, editingId
          ? belts.find((b) => b.id === editingId)?.sortOrder ?? belts.length
          : belts.length),
        isEnable: form.isEnable,
      };
      if (editingId) {
        await adminGql(UPDATE_BELT, { id: editingId, input });
        toast.success("Belt updated");
      } else {
        await adminGql(STORE_BELT, { input });
        toast.success("Belt created");
      }
      setEditingId(null);
      setForm(emptyForm(categories));
      await load();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    try {
      await adminGql(DELETE_BELT, { id });
      if (editingId === id) {
        setEditingId(null);
        setForm(emptyForm(categories));
      }
      await load();
      toast.success("Deleted");
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  function sourceLabel(belt: any) {
    if (belt.sourceType === "CATEGORY") {
      return `Category · ${belt.category?.name || "—"}`;
    }
    if (belt.sourceType === "SUBCATEGORY") {
      return `Subcategory · ${belt.subCategory?.name || "—"}`;
    }
    return `Handpicked · ${belt.items?.length || 0} items`;
  }

  const canDrag = !query.trim();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1
            className="text-3xl md:text-4xl"
            style={{ fontFamily: "var(--font-display), serif" }}
          >
            Belts
          </h1>
          <p className="text-sm text-[var(--muted)]">
            Drag to reorder. Each belt uses a category, subcategory, or
            handpicked menus.
          </p>
        </div>
        <button type="button" className="btn btn-primary" onClick={startCreate}>
          New belt
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
        <div className="space-y-3">
          <AdminSearchBar
            value={query}
            onChange={setQuery}
            placeholder="Search belts…"
          />
          {filtered.length === 0 ? (
            <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
              {belts.length === 0
                ? "No belts yet. Create one or run the seeder."
                : "No matches for that search."}
            </div>
          ) : canDrag ? (
            <SortableList
              items={filtered}
              onReorder={(next) => void persistOrder(next)}
              renderItem={(belt, handle) => (
                <div className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                  <div className="flex min-w-0 items-center gap-3">
                    {handle}
                    <div className="min-w-0">
                      <div className="font-semibold">{belt.name}</div>
                      <div className="text-xs text-[var(--muted)]">
                        {sourceLabel(belt)} ·{" "}
                        {belt.isSlider ? "Slider" : "Grid"}
                        {!belt.isEnable ? " · Hidden" : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary !px-3 !py-2 text-sm"
                      onClick={() => startEdit(belt)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger !px-3 !py-2 text-sm"
                      onClick={() => remove(belt.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )}
            />
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-[var(--muted)]">
                Clear search to drag-reorder.
              </p>
              {filtered.map((belt) => (
                <div
                  key={belt.id}
                  className="surface-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4"
                >
                  <div className="min-w-0">
                    <div className="font-semibold">{belt.name}</div>
                    <div className="text-xs text-[var(--muted)]">
                      {sourceLabel(belt)} · {belt.isSlider ? "Slider" : "Grid"}
                      {!belt.isEnable ? " · Hidden" : ""}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary !px-3 !py-2 text-sm"
                      onClick={() => startEdit(belt)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger !px-3 !py-2 text-sm"
                      onClick={() => remove(belt.id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card space-y-4 rounded-2xl p-5">
          <h2 className="font-bold">
            {editingId ? "Edit belt" : "Create belt"}
          </h2>

          <BeltSourceFields
            value={form}
            categories={categories}
            onChange={(next) => setForm({ ...form, ...next })}
          />

          <label className="flex min-h-11 cursor-pointer items-center gap-3">
            <input
              type="checkbox"
              checked={form.isEnable}
              onChange={(e) =>
                setForm({ ...form, isEnable: e.target.checked })
              }
              className="h-4 w-4 accent-[var(--brand)]"
            />
            <span className="text-sm font-medium">Enabled</span>
          </label>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy}
              onClick={() => void save()}
            >
              {busy ? "Saving…" : editingId ? "Update belt" : "Create belt"}
            </button>
            {editingId ? (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setEditingId(null);
                  setForm(emptyForm(categories));
                }}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
