"use client";

import { useEffect, useState } from "react";

export function ScrollProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      setPct(total > 0 ? (scrolled / total) * 100 : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="fixed left-0 right-0 top-0 z-[55] h-[2px]"
      style={{ pointerEvents: "none" }}
    >
      <div
        className="h-full transition-[width] duration-100"
        style={{
          width: `${pct}%`,
          background: "linear-gradient(90deg, var(--orange), #FFB174)",
        }}
      />
    </div>
  );
}
