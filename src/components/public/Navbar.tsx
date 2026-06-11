"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ArrowUpRight } from "@/components/Icons";

const NAV_ITEMS = [
  { id: "home", label: "Inicio", href: "/" },
  { id: "nosotros", label: "Nosotros", href: "/nosotros" },
  { id: "servicios", label: "Servicios", href: "/servicios", hasDropdown: true },
  { id: "portafolio", label: "Portafolio", href: "/portafolio" },
  { id: "blog", label: "Blog", href: "/blog" },
  { id: "contacto", label: "Contacto", href: "/contacto" },
];

const SERVICES = [
  { id: "produccion-audiovisual", label: "Producción Audiovisual" },
  { id: "fotografia", label: "Fotografía" },
  { id: "contenido-redes", label: "Contenido para Redes" },
  { id: "ia-contenido", label: "IA Aplicada al Contenido" },
  { id: "livestreaming", label: "Livestreaming" },
  { id: "post-produccion", label: "Post-producción" },
];

export function Navbar() {
  const [svcOpen, setSvcOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();

  // "Hover intent": abrir al instante, pero cerrar con un pequeño retraso para
  // que el cursor pueda viajar del botón al menú sin que se cierre de golpe.
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setSvcOpen(true);
  };
  const closeMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setSvcOpen(false), 220);
  };
  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      <nav
        className={`fixed left-0 right-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
        style={{
          padding: scrolled
            ? "8px clamp(16px,4vw,64px)"
            : "16px clamp(16px,4vw,64px)",
          background: scrolled ? "rgba(8,8,8,0.85)" : "transparent",
          backdropFilter: scrolled ? "blur(12px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="mx-auto flex max-w-[1600px] items-center justify-between">
          <Link href="/" className="block">
            <Logo size={scrolled ? 0.85 : 1} />
          </Link>

          {/* Desktop pill nav */}
          <div className="hidden items-center gap-0.5 lg:flex">
            {NAV_ITEMS.map((item) =>
              item.hasDropdown ? (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={openMenu}
                  onMouseLeave={closeMenu}
                  onFocus={openMenu}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setSvcOpen(false);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setSvcOpen(false);
                  }}
                >
                  <Link
                    href={item.href}
                    aria-haspopup="menu"
                    aria-expanded={svcOpen}
                    onClick={() => setSvcOpen(false)}
                    className={`flex items-center gap-1.5 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                      isActive(item.href)
                        ? "text-orange"
                        : "text-white/85 hover:text-white"
                    }`}
                  >
                    {item.label}
                    <svg
                      width="8"
                      height="5"
                      viewBox="0 0 8 5"
                      fill="none"
                      className="opacity-50 transition-transform"
                      style={{ transform: svcOpen ? "rotate(180deg)" : "none" }}
                    >
                      <path
                        d="M1 1l3 3 3-3"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </Link>
                  {svcOpen && (
                    // Contenedor exterior pegado al botón (top-full) con un
                    // puente transparente de 10px (pt-2.5): el cursor viaja del
                    // botón al menú sin pasar por una zona muerta que lo cierre.
                    <div className="absolute left-1/2 top-full -translate-x-1/2 pt-2.5">
                      <div
                        role="menu"
                        aria-label="Servicios"
                        className="overflow-hidden rounded-2xl py-2"
                        style={{
                          minWidth: 260,
                          background: "rgba(8,8,8,0.97)",
                          boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
                        }}
                      >
                        <Link
                          href="/servicios"
                          role="menuitem"
                          onClick={() => setSvcOpen(false)}
                          className="flex items-center gap-3 border-l-2 border-orange px-5 py-[11px] text-[12px] font-semibold text-white hover:bg-white/5 focus-visible:bg-white/10 focus-visible:outline-none"
                        >
                          Ver todos los servicios →
                        </Link>
                        <div className="my-1 h-px bg-white/5" />
                        {SERVICES.map((s) => (
                          <Link
                            key={s.id}
                            href={`/servicio/${s.id}`}
                            role="menuitem"
                            onClick={() => setSvcOpen(false)}
                            className="flex items-center gap-3 border-l-2 border-transparent px-5 py-[10px] text-[12px] font-medium text-white/65 transition-all hover:border-l-orange hover:bg-white/5 hover:text-white focus-visible:border-l-orange focus-visible:bg-white/10 focus-visible:text-white focus-visible:outline-none"
                          >
                            <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-orange/50" />
                            {s.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
                    isActive(item.href)
                      ? "text-orange"
                      : "text-white/85 hover:text-white"
                  }`}
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link
              href="/contacto"
              className="ml-3 flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
            >
              Hablemos <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="hidden items-center gap-2 lg:flex">
            <Link
              href="/cms/login?next=/api/auth/post-login"
              aria-label="Portal clientes"
              title="Acceso para clientes y equipo"
              className="flex items-center gap-1.5 whitespace-nowrap rounded-full border border-orange/40 bg-orange/[0.08] px-3.5 py-1.5 text-[12px] font-semibold text-orange transition-colors hover:bg-orange/15"
            >
              <svg width="13" height="13" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 1112 0H2z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Clientes
            </Link>
            <Link
              href="/admin"
              aria-label="Administración"
              title="Administración del sitio"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white/35 transition-colors hover:border-white/30 hover:bg-white/5 hover:text-white/85"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menú"
            className="lg flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
          >
            <svg
              width="18"
              height="14"
              viewBox="0 0 18 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              className="text-white"
            >
              <path d="M1 1h16M1 7h16M1 13h16" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-[60] flex flex-col lg:hidden"
          style={{ background: "rgba(0,0,0,0.97)", backdropFilter: "blur(20px)" }}
        >
          <div
            className="flex items-center justify-between border-b px-5 py-4"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <Logo size={0.95} />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              aria-label="Cerrar menú"
              className="lg flex h-10 w-10 items-center justify-center rounded-full"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                className="text-white"
              >
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          <nav
            className="flex flex-1 flex-col overflow-y-auto px-5 py-6"
            onClick={() => setMobileOpen(false)}
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="border-b py-4 font-heading italic text-white"
                style={{
                  fontSize: 28,
                  lineHeight: 1.1,
                  borderColor: "rgba(255,255,255,0.06)",
                }}
              >
                {item.label}
              </Link>
            ))}

            <div className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Servicios
            </div>
            <div className="flex flex-col gap-1">
              {SERVICES.map((s) => (
                <Link
                  key={s.id}
                  href={`/servicio/${s.id}`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-white/65 hover:bg-white/5 hover:text-white"
                >
                  <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-orange/60" />
                  {s.label}
                </Link>
              ))}
            </div>
          </nav>

          <div
            className="flex flex-col gap-3 border-t p-5"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
            onClick={() => setMobileOpen(false)}
          >
            <Link
              href="/contacto"
              className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black"
            >
              Hablemos <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cms/login"
              className="flex items-center justify-center gap-2 rounded-full border border-orange/40 bg-orange/[0.08] px-5 py-3 text-[14px] font-semibold text-orange"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path
                  d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 1112 0H2z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinejoin="round"
                />
              </svg>
              Acceso clientes
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
