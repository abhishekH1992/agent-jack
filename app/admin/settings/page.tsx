"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { adminGql } from "@/lib/admin";
import { uploadAdminFiles } from "@/lib/admin-upload";
import { SITE_QUERY, UPDATE_SITE } from "@/lib/queries";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

export default function AdminSettingsPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");
  const [banners, setBanners] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    adminGql<{ site: any }>(SITE_QUERY)
      .then((data) => {
        setName(data.site?.name || "");
        setEmail(data.site?.email || "");
        setLogo(data.site?.logo || "");
        setBanners(data.site?.banners || []);
      })
      .catch(console.error);
  }, []);

  async function onPickFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      const urls = await uploadAdminFiles(files, "banners");
      setBanners((prev) => [...prev, ...urls]);
      toast.success(
        urls.length === 1 ? "Image uploaded" : `${urls.length} images uploaded`,
      );
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function removeBanner(index: number) {
    setBanners((prev) => prev.filter((_, i) => i !== index));
  }

  function moveBanner(index: number, dir: -1 | 1) {
    setBanners((prev) => {
      const next = [...prev];
      const target = index + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function save() {
    setSaving(true);
    try {
      await adminGql(UPDATE_SITE, {
        input: { name, email, logo, banners },
      });
      toast.success("Saved");
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1
          className="text-3xl md:text-4xl"
          style={{ fontFamily: "var(--font-display), serif" }}
        >
          Settings
        </h1>
        <p className="text-sm text-[var(--muted)]">
          Restaurant profile. Stripe secrets stay in environment variables.
        </p>
      </div>

      <div className="surface-card space-y-3 rounded-2xl p-5">
        <input
          className="input"
          placeholder="Restaurant name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <input
          className="input"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <ImageUploadField
          label="Logo"
          value={logo}
          onChange={setLogo}
        />

        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Home banners
            </span>
            <button
              type="button"
              className="btn btn-secondary !px-3 !py-2 text-sm"
              disabled={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {uploading ? "Uploading…" : "Upload images"}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              multiple
              className="hidden"
              onChange={(e) => onPickFiles(e.target.files)}
            />
          </div>

          {banners.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-6 text-center text-sm text-[var(--muted)]">
              No banners yet. Upload one or more images — leave empty to keep
              the text hero.
            </p>
          ) : (
            <ul className="space-y-2">
              {banners.map((url, index) => (
                <li
                  key={`${url}-${index}`}
                  className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-2"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt=""
                    className="h-16 w-24 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs text-[var(--muted)]">
                      {url}
                    </div>
                    <div className="mt-1 text-xs font-medium">
                      Slide {index + 1}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col gap-1">
                    <button
                      type="button"
                      className="btn btn-secondary !min-h-9 !px-2 !py-1 text-xs"
                      disabled={index === 0}
                      onClick={() => moveBanner(index, -1)}
                    >
                      Up
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary !min-h-9 !px-2 !py-1 text-xs"
                      disabled={index === banners.length - 1}
                      onClick={() => moveBanner(index, 1)}
                    >
                      Down
                    </button>
                    <button
                      type="button"
                      className="btn btn-danger !min-h-9 !px-2 !py-1 text-xs"
                      onClick={() => removeBanner(index)}
                    >
                      Remove
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-xs text-[var(--muted)]">
            JPG, PNG, WebP or GIF · up to 8MB each · multiple files supported.
            Save settings after uploading.
          </p>
        </div>

        <button
          className="btn btn-primary w-full"
          disabled={saving || uploading}
          onClick={save}
        >
          {saving ? "Saving…" : "Save settings"}
        </button>
      </div>

      <div className="surface-card rounded-2xl p-5 text-sm text-[var(--muted)]">
        <p className="mb-2 font-semibold text-[var(--ink)]">Payments setup</p>
        <ol className="list-decimal space-y-1 pl-5">
          <li>Set `STRIPE_SECRET_KEY` and webhook secret on the server.</li>
          <li>
            In Stripe Dashboard → Settings → Payment methods, enable Apple Pay
            and Google Pay.
          </li>
          <li>
            Hosted Checkout shows wallets automatically on supported devices.
          </li>
        </ol>
      </div>
    </div>
  );
}
