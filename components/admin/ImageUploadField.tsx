"use client";

import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { uploadAdminFiles } from "@/lib/admin-upload";

export function ImageUploadField({
  label = "Image",
  value,
  onChange,
  folder = "images",
  multiple = false,
  onFiles,
}: {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  folder?: "banners" | "images";
  multiple?: boolean;
  onFiles?: (files: File[]) => Promise<void> | void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function onPick(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    try {
      if (onFiles) {
        await onFiles(Array.from(files));
        toast.success(multiple ? "Images uploaded" : "Image uploaded");
      } else {
        const urls = await uploadAdminFiles(
          multiple ? Array.from(files) : [files[0]],
          folder,
        );
        onChange(urls[0] || "");
        toast.success("Image uploaded");
      }
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
            {uploading
              ? "Uploading…"
              : multiple
                ? "Add images"
                : value
                  ? "Replace"
                  : "Upload"}
          </button>
          {!multiple && value ? (
            <button
              type="button"
              className="btn btn-danger !px-3 !py-2 text-sm"
              disabled={uploading}
              onClick={() => onChange("")}
            >
              Remove
            </button>
          ) : null}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          multiple={multiple}
          onChange={(e) => onPick(e.target.files)}
        />
      </div>

      {!multiple ? (
        value ? (
          <div className="overflow-hidden rounded-xl border border-[var(--line)] bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="h-36 w-full object-cover" />
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[var(--line)] px-3 py-5 text-center text-sm text-[var(--muted)]">
            No image uploaded
          </p>
        )
      ) : null}
    </div>
  );
}
