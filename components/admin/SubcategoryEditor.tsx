"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import {
  ADMIN_CATALOG_QUERY,
  STORE_SUBCATEGORY,
  UPDATE_SUBCATEGORY,
} from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { IMAGE_SIZE_HINTS } from "@/lib/image-sizes";

type Form = {
  name: string;
  image: string;
  isEnable: boolean;
  categoryId: string;
};

const empty = (): Form => ({
  name: "",
  image: "",
  isEnable: true,
  categoryId: "",
});

export function SubcategoryEditor({
  subcategoryId,
}: {
  subcategoryId?: string;
}) {
  const router = useRouter();
  const isEdit = Boolean(subcategoryId);
  const [categories, setCategories] = useState<any[]>([]);
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
        const data = await adminGql<{ categories: any[] }>(ADMIN_CATALOG_QUERY);
        if (cancelled) return;
        setCategories(data.categories);
        if (subcategoryId) {
          const sub = data.categories
            .flatMap((c) =>
              (c.subCategories || []).map((s: any) => ({
                ...s,
                categoryId: s.categoryId || c.id,
              })),
            )
            .find((s) => s.id === subcategoryId);
          if (!sub) {
            setNotFound(true);
            setForm(empty());
          } else {
            setForm({
              name: sub.name,
              image: sub.image || "",
              isEnable: Boolean(sub.isEnable),
              categoryId: sub.categoryId || data.categories[0]?.id || "",
            });
          }
        } else {
          setForm({
            ...empty(),
            categoryId: data.categories[0]?.id || "",
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
  }, [subcategoryId]);

  async function save() {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.categoryId) return toast.error("Select a category");
    setBusy(true);
    try {
      const input = {
        name: form.name.trim(),
        image: form.image.trim() || null,
        isEnable: form.isEnable,
        categoryId: form.categoryId,
      };
      if (subcategoryId) {
        await adminGql(UPDATE_SUBCATEGORY, { id: subcategoryId, input });
        toast.success("Subcategory updated");
      } else {
        await adminGql(STORE_SUBCATEGORY, { input });
        toast.success("Subcategory created");
      }
      router.push("/admin/subcategories");
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="text-sm text-[var(--muted)]">Loading subcategory…</div>
    );
  }

  if (notFound) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-[var(--muted)]">Subcategory not found.</p>
        <Link
          href="/admin/subcategories"
          className="btn btn-secondary !rounded-xl"
        >
          Back to subcategories
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/subcategories"
          className="text-sm font-semibold text-[var(--muted)] hover:text-[var(--ink)]"
        >
          ← Subcategories
        </Link>
        <h1
          className="mt-2 text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          {isEdit ? "Edit subcategory" : "New subcategory"}
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Sections inside a category (e.g. BURGER, BEER).
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
            placeholder="e.g. BURGER"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
            Category *
          </span>
          <select
            className="input"
            value={form.categoryId}
            onChange={(e) => setForm({ ...form, categoryId: e.target.value })}
          >
            <option value="">Select category</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <ImageUploadField
          value={form.image}
          onChange={(image) => setForm({ ...form, image })}
          hint={IMAGE_SIZE_HINTS.subcategory}
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
            {busy
              ? "Saving…"
              : isEdit
                ? "Update subcategory"
                : "Create subcategory"}
          </button>
          <Link
            href="/admin/subcategories"
            className="btn btn-secondary !rounded-xl"
          >
            Cancel
          </Link>
        </div>
      </section>
    </div>
  );
}
