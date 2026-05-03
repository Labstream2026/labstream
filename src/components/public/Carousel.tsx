"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type Slide = {
  url: string;
  alt?: string;
  caption?: string;
  linkHref?: string;
};

export function Carousel({
  slides,
  autoplay = true,
  intervalSeconds = 5,
  loop = true,
  indicators = true,
  aspectRatio = "16/9",
}: {
  slides: Slide[];
  autoplay?: boolean;
  intervalSeconds?: number;
  loop?: boolean;
  indicators?: boolean;
  aspectRatio?: "16/9" | "4/3" | "1/1" | "21/9";
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (!autoplay || slides.length <= 1 || paused) return;
    const t = setInterval(() => {
      setIndex((i) => {
        const next = i + 1;
        if (next >= slides.length) return loop ? 0 : i;
        return next;
      });
    }, Math.max(2, intervalSeconds) * 1000);
    return () => clearInterval(t);
  }, [autoplay, intervalSeconds, slides.length, paused, loop]);

  if (slides.length === 0) return null;

  const goTo = (i: number) => {
    if (i < 0) i = loop ? slides.length - 1 : 0;
    if (i >= slides.length) i = loop ? 0 : slides.length - 1;
    setIndex(i);
  };

  const arStyle: Record<string, string> = {
    "16/9": "16 / 9",
    "4/3": "4 / 3",
    "1/1": "1 / 1",
    "21/9": "21 / 9",
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-black"
      style={{ aspectRatio: arStyle[aspectRatio] }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {slides.map((s, i) => {
        const inner = (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={s.url}
              alt={s.alt ?? ""}
              className="h-full w-full object-cover"
              loading={i === 0 ? "eager" : "lazy"}
            />
            {s.caption && (
              <div
                className="absolute bottom-0 left-0 right-0 px-6 py-4 text-[14px] text-white"
                style={{
                  background:
                    "linear-gradient(180deg, transparent, rgba(0,0,0,0.75))",
                }}
              >
                {s.caption}
              </div>
            )}
          </>
        );
        return (
          <div
            key={i}
            className="absolute inset-0 transition-opacity duration-700"
            style={{ opacity: i === index ? 1 : 0, pointerEvents: i === index ? "auto" : "none" }}
          >
            {s.linkHref ? (
              <Link href={s.linkHref} className="block h-full w-full">
                {inner}
              </Link>
            ) : (
              inner
            )}
          </div>
        );
      })}

      {slides.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-[18px] text-white hover:bg-black/60"
            aria-label="Anterior"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/40 px-3 py-2 text-[18px] text-white hover:bg-black/60"
            aria-label="Siguiente"
          >
            ›
          </button>
          {indicators && (
            <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => goTo(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                  aria-label={`Slide ${i + 1}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
