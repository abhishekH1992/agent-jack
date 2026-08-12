"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadAdminFiles } from "@/lib/admin-upload";

export function ImageUploadField({
  label = "Image",
  value,
  onChange,
  folder = "images",
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: "banners" | "images";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(files: FileList | null) {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const urls = await uploadAdminFiles([files[0]], folder);
      onChange(urls[0] || "");
      toast.success("Image uploaded");
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
          {label}
        </span>
        <div className="flex gap-2">
          <button
            type="button"
            className="btn btn-secondary !px-3 !py-2 text-sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? "Uploading…" : value ? "Replace" : "Upload"}
          </button>
          {value && (
            <button
              type="button"
              className="btn btn-danger !px-3 !py-2 text-sm"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => onPick(e.target.files)}
        />
      </div>

      {value ? (
        <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt=""
            className="h-36 w-full object-cover"
          />
        </div>
      ) : (
        <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--muted)]">
          No image uploaded
        </p>
      )}
    </div>
  );
}
