"use client";

import { useState, type KeyboardEvent } from "react";

export function TagInput({
  label = "Tags",
  value,
  onChange,
  placeholder = "Type a tag and press Enter",
}: {
  label?: string;
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}) {
  const [draft, setDraft] = useState("");

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^,+|,+$/g, "");
    if (!tag) return;
    const exists = value.some((t) => t.toLowerCase() === tag.toLowerCase());
    if (exists) {
      setDraft("");
      return;
    }
    onChange([...value, tag]);
    setDraft("");
  }

  function removeTag(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(draft);
      return;
    }
    if (e.key === "Backspace" && !draft && value.length) {
      removeTag(value.length - 1);
    }
  }

  return (
    <div className="space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
        {label}
      </span>
      <div className="flex min-h-12 flex-wrap items-center gap-2 rounded-[0.75rem] border border-[var(--line)] bg-white px-3 py-2 focus-within:border-[var(--brand)] focus-within:ring-4 focus-within:ring-[rgba(234,88,12,0.18)]">
        {value.map((tag, index) => (
          <span
            key={`${tag}-${index}`}
            className="inline-flex max-w-full items-center gap-1 rounded-full bg-[var(--brand-soft)] py-1 pl-2.5 pr-1 text-sm font-medium text-[var(--ink)]"
          >
            <span className="truncate">{tag}</span>
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-[var(--muted)] transition hover:bg-white hover:text-[var(--ink)]"
              onClick={() => removeTag(index)}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
                <path
                  d="M3 3l6 6M9 3L3 9"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 border-0 bg-transparent py-1 text-base outline-none placeholder:text-[var(--muted)]"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={() => addTag(draft)}
          placeholder={value.length ? "" : placeholder}
        />
      </div>
      <p className="text-xs text-[var(--muted)]">
        Press Enter or comma to add. Click × to remove.
      </p>
    </div>
  );
}
