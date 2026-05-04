"use client";

import { useRef, useState } from "react";

export function BeforeAfterSlider({
  before,
  after,
  label,
}: {
  before: string;
  after: string;
  label?: string;
}) {
  const [pos, setPos] = useState(50);
  const ref = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);

  const updateFromX = (clientX: number) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const p = ((clientX - rect.left) / rect.width) * 100;
    setPos(Math.min(100, Math.max(0, p)));
  };

  return (
    <div className="overflow-hidden rounded-2xl">
      <div
        ref={ref}
        className="relative aspect-video w-full select-none"
        onMouseMove={(e) => {
          if (dragging.current) updateFromX(e.clientX);
        }}
        onMouseUp={() => (dragging.current = false)}
        onMouseLeave={() => (dragging.current = false)}
        onTouchMove={(e) => updateFromX(e.touches[0].clientX)}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={after}
          alt="Después"
          className="absolute inset-0 h-full w-full object-cover"
          draggable={false}
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ width: `${pos}%` }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={before}
            alt="Antes"
            className="absolute inset-0 h-full w-full object-cover"
            style={{ width: `${100 / (pos / 100)}%`, maxWidth: "none" }}
            draggable={false}
            referrerPolicy="no-referrer"
          />
        </div>

        {/* Handle */}
        <div
          className="absolute top-0 h-full w-0.5 cursor-ew-resize bg-white"
          style={{ left: `${pos}%`, transform: "translateX(-50%)" }}
          onMouseDown={() => (dragging.current = true)}
          onTouchStart={() => (dragging.current = true)}
        >
          <div
            className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-black shadow-lg"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M0 7l4-4M14 7l-4-4M0 7l4 4M14 7l-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>

        <div className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white">
          Antes
        </div>
        <div className="absolute right-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[10px] uppercase tracking-wider text-white">
          Después
        </div>
      </div>
      {label && (
        <div className="px-4 py-2 text-center text-[12px] text-white/55">
          {label}
        </div>
      )}
    </div>
  );
}
