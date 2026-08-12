"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

export function ImageBlock({
  images,
  layout,
}: {
  images: string[];
  layout: "SINGLE" | "COLUMN" | "SLIDER";
}) {
  const list = images.filter(Boolean);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (layout !== "SLIDER" || list.length < 2) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % list.length);
    }, 4000);
    return () => clearInterval(id);
  }, [layout, list.length]);

  if (!list.length) return null;

  if (layout === "COLUMN") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        {list.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={src}
            src={src}
            alt=""
            className="h-48 w-full rounded-2xl object-cover sm:h-56"
          />
        ))}
      </div>
    );
  }

  if (layout === "SLIDER") {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-[cubic-bezier(0.2,0,0,1)]"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {list.map((src) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt=""
              className="h-52 w-full shrink-0 object-cover sm:h-72"
            />
          ))}
        </div>
        {list.length > 1 ? (
          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {list.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Go to slide ${i + 1}`}
                className={clsx(
                  "h-2 w-2 rounded-full transition",
                  i === index ? "bg-white" : "bg-white/50",
                )}
                onClick={() => setIndex(i)}
              />
            ))}
          </div>
        ) : null}
      </div>
    );
  }

  // SINGLE — full width
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={list[0]}
      alt=""
      className="w-full rounded-2xl object-cover"
    />
  );
}
