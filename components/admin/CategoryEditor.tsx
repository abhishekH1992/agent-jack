"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  STORE_CATEGORY,
  UPDATE_CATEGORY,
} from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

type Form = {
  name: string;
  slug: string;
  image: string;
  isEnable: boolean;
  categoryTypeId: string;
};

const empty = (): Form => ({
  name: "",
  slug: "",
  image: "",
  isEnable: true,
  categoryTypeId: "",
});

export function CategoryEditor({ categoryId }: { categoryId?: string }) {
  const router = useRouter();
  const isEdit = Boolean(categoryId);
  const [types, setTypes] = useState<any[]>([]);
  const [form, setForm] = useState<Form>(empty());
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setNotFound(false);
      try {
        const data = await adminGql<{
          categories: any[];
          categoryTypes: any[];
        }>(ADMIN_CATALOG_QUERY);
        if (cancelled) return;
        setTypes(data.categoryTypes);
        if (categoryId) {
          const cat = data.categories.find((c) => c.id === categoryId);
          if (!cat) {
            setNotFound(true);
            setForm(empty());
          } else {
            setForm({
              name: cat.name,
              slug: cat.slug || "",
              image: cat.image || "",
              isEnable: Boolean(cat.isEnable),
              categoryTypeId:
                cat.categoryType?.id || data.categoryTypes[0]?.id || "",
            });
          }
        } else {
          setForm({
            ...empty(),
            categoryTypeId: data.categoryTypes[0]?.id || "",
          });
        }
      } catch (err: any) {
        if (!cancelled) toast.error(err.message || "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [categoryId]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.categoryTypeId) return toast.error("Select a type");
    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        slug: form.slug.trim() || undefined,
        image: form.image.trim() || null,
        isEnable: form.isEnable,
        categoryTypeId: form.categoryTypeId,
      };
      if (categoryId) {
        await adminGql(UPDATE_CATEGORY, { id: categoryId, input });
        toast.success("Category updated");
      } else {
        await adminGql(STORE_CATEGORY, { input });
        toast.success("Category created");
      }
      router.push("/admin/categories");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-[var(--muted)]">Loading category…</div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Category not found.</p>
        <Link
          href="/admin/categories"
          className="btn btn-secondary !rounded-xl"
        >
          Back to categories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/categories"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Categories
        </Link>
        <h1
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {isEdit ? "Edit category" : "New category"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Top-level menu groups (e.g. THE BASICS, ON TAP).
        </p>
      </div>

      <section className="surface-card space-y-4 rounded-2xl p-4 md:p-6">
        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Name *
          </span>
          <input
            className="input"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. THE BASICS"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Slug
          </span>
          <input
            className="input"
            value={form.slug}
            onChange={(e) => setForm({ ...form, slug: e.target.value })}
            placeholder="auto from name if empty"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Type *
          </span>
          <select
            className="input"
            value={form.categoryTypeId}
            onChange={(e) =>
              setForm({ ...form, categoryTypeId: e.target.value })
            }
          >
            <option value="">Select type</option>
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </label>

        <ImageUploadField
          value={form.image}
          onChange={(image) => setForm({ ...form, image })}
        />

        <label className="flex min-h-11 cursor-pointer items-center gap-3">
          <input
            type="checkbox"
            checked={form.isEnable}
            onChange={(e) => setForm({ ...form, isEnable: e.target.checked })}
            className="h-4 w-4 accent-[var(--brand)]"
          />
          <span className="text-sm font-medium">Enabled</span>
        </label>

        <div className="flex flex-wrap gap-2 border-t border-[var(--line)] pt-4">
          <button
            type="button"
            className="btn btn-primary !rounded-xl"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : isEdit ? "Update category" : "Create category"}
          </button>
          <Link
            href="/admin/categories"
            className="btn btn-secondary !rounded-xl"
          >
            Cancel
          </Link>
        </div>
      </section>
    </div>
  );
}
