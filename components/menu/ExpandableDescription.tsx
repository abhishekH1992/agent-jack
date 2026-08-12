"use client";

import { useEffect, useRef, useState } from "react";
import clsx from "clsx";

/** Clamps to N lines; shows More / Less when content overflows. */
export function ExpandableDescription({
  text,
  lines = 3,
  className,
}: {
  text: string;
  lines?: number;
  className?: string;
}) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [text]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function measure() {
      if (!el || expanded) return;
      // Overflow when clamped content is shorter than full scroll height
      setNeedsMore(el.scrollHeight > el.clientHeight + 1);
    }

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, lines, expanded]);

  if (!text.trim()) return null;

  return (
    <div className={clsx("min-w-0", className)}>
      <p
        ref={ref}
        className={clsx(
          "text-sm text-[var(--muted)] whitespace-pre-wrap break-words",
          !expanded && "overflow-hidden",
        )}
        style={
          expanded
            ? undefined
            : {
                display: "-webkit-box",
                WebkitLineClamp: lines,
                WebkitBoxOrient: "vertical" as const,
              }
        }
      >
        {text}
      </p>
      {needsMore || expanded ? (
        <button
          type="button"
          className="mt-1 text-sm font-semibold text-[var(--brand)] hover:underline"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? "Less" : "More"}
        </button>
      ) : null}
    </div>
  );
}
