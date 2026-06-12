"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Conmutador de tema claro/oscuro para la webapp y el CMS. Escribe `data-theme`
 * en el wrapper del shell (el ancestro con [data-theme]) — NO en <html> — para
 * que el modo claro NO afecte a la web pública. Persiste en cookie (la lee el
 * layout en SSR, sin parpadeo).
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const host = btnRef.current?.closest("[data-theme]") as HTMLElement | null;
    const cur = host?.getAttribute("data-theme");
    setTheme(cur === "light" ? "light" : "dark");
    setMounted(true);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    const host = btnRef.current?.closest("[data-theme]") as HTMLElement | null;
    if (host) host.setAttribute("data-theme", next);
    try {
      localStorage.setItem("theme", next);
    } catch {
      /* almacenamiento bloqueado: seguimos con la cookie */
    }
    document.cookie = `theme=${next}; path=/; max-age=31536000; SameSite=Lax`;
  }

  return (
    <button
      ref={btnRef}
      type="button"
      onClick={toggle}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      className={`inline-flex items-center justify-center rounded-md border border-[var(--hairline)] bg-[var(--elev-1)] text-[var(--text)] transition-colors hover:bg-[var(--elev-2)] ${className}`}
      style={{ width: 34, height: 34 }}
    >
      {/* Sólo mostramos el icono tras montar para evitar mismatch de hidratación */}
      <span aria-hidden style={{ fontSize: 15, lineHeight: 1 }}>
        {!mounted ? "" : theme === "dark" ? "☀" : "☾"}
      </span>
    </button>
  );
}
