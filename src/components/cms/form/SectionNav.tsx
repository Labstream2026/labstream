"use client";

import { useEffect, useState } from "react";

type SectionItem = { id: string; label: string };

type Props = {
  /** Ordered list of section ids + their visible labels. */
  sections: SectionItem[];
};

/**
 * Sticky table of contents for long editor pages. Scrollspy-driven via
 * IntersectionObserver, no scroll listeners.
 *
 * Hidden below the `lg` breakpoint (where there's no room for a side rail).
 *
 * Pair each section in the form with `<Section id="..." title="...">` and
 * pass the same ids here.
 */
export function SectionNav({ sections }: Props) {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (sections.length === 0) return;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter((el): el is HTMLElement => !!el);
    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the topmost intersecting section. Falls back to last-known
        // active when nothing is intersecting (e.g., between sections).
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort(
            (a, b) =>
              a.boundingClientRect.top - b.boundingClientRect.top,
          );
        if (visible[0]?.target.id) setActiveId(visible[0].target.id);
      },
      {
        // Trigger when section's top crosses ~25% from top of viewport.
        rootMargin: "-20% 0px -70% 0px",
        threshold: 0,
      },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sections]);

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 24;
    window.scrollTo({ top: y, behavior: "smooth" });
    setActiveId(id);
    history.replaceState(null, "", `#${id}`);
  };

  return (
    <nav
      aria-label="Secciones del editor"
      className="hidden lg:sticky lg:top-6 lg:block"
    >
      <div className="text-[10px] font-semibold uppercase tracking-widest text-white/35">
        Secciones
      </div>
      <ul className="mt-2 flex flex-col gap-0.5 border-l border-white/8">
        {sections.map((s) => {
          const active = s.id === activeId;
          return (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                onClick={(e) => handleClick(e, s.id)}
                className={`relative -ml-px block border-l-2 py-1.5 pl-3 text-[12px] transition-colors ${
                  active
                    ? "border-orange text-orange"
                    : "border-transparent text-white/55 hover:text-white"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
