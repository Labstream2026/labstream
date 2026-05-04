"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Counter que se anima de 0 al valor target cuando aparece en pantalla.
 * Soporta valores tipo "12+" o "340" o "4K" — extrae el número y mantiene el sufijo/prefijo.
 */
export function AnimatedStat({
  value,
  label,
  durationMs = 1400,
}: {
  value: string;
  label: string;
  durationMs?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !animated) {
          setAnimated(true);
          animateNumber(value, durationMs, setDisplay);
        }
      },
      { threshold: 0.4 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [value, durationMs, animated]);

  return (
    <div ref={ref} className="lg rounded-2xl p-5 text-left">
      <div
        className="font-heading italic text-white"
        style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-1px" }}
      >
        {display}
      </div>
      <div className="mt-2 text-[12px] font-light leading-tight text-white/80">
        {label}
      </div>
    </div>
  );
}

function animateNumber(
  raw: string,
  durationMs: number,
  set: (v: string) => void,
) {
  // Extract numeric part — keeps prefix and suffix
  const match = raw.match(/^([^\d]*)(\d+)([^\d]*)$/);
  if (!match) {
    set(raw);
    return;
  }
  const prefix = match[1];
  const target = parseInt(match[2], 10);
  const suffix = match[3];

  const start = Date.now();
  const tick = () => {
    const elapsed = Date.now() - start;
    const t = Math.min(1, elapsed / durationMs);
    // Easing easeOutCubic
    const eased = 1 - Math.pow(1 - t, 3);
    const current = Math.round(target * eased);
    set(`${prefix}${current}${suffix}`);
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
