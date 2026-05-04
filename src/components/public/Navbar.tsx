"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
    setSvcOpen(false);
  }, [pathname]);

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
                  onMouseEnter={() => setSvcOpen(true)}
                  onMouseLeave={() => setSvcOpen(false)}
                >
                  <Link
                    href={item.href}
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
                    <div
                      className="lg absolute left-1/2 top-[calc(100%+10px)] -translate-x-1/2 overflow-hidden rounded-2xl py-2"
                      style={{
                        minWidth: 260,
                        background: "rgba(8,8,8,0.97)",
                        boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
                      }}
                    >
                      <Link
                        href="/servicios"
                        className="flex items-center gap-3 border-l-2 border-orange px-5 py-[11px] text-[12px] font-semibold text-white hover:bg-white/5"
                      >
                        Ver todos los servicios →
                      </Link>
                      <div className="my-1 h-px bg-white/5" />
                      {SERVICES.map((s) => (
                        <Link
                          key={s.id}
                          href={`/servicio/${s.id}`}
                          className="flex items-center gap-3 border-l-2 border-transparent px-5 py-[10px] text-[12px] font-medium text-white/65 transition-all hover:border-l-orange hover:bg-white/5 hover:text-white"
                        >
                          <span className="h-[5px] w-[5px] flex-shrink-0 rounded-full bg-orange/50" />
                          {s.label}
                        </Link>
                      ))}
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
              href="/cms"
              className="lg flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-semibold tracking-wider text-white"
            >
              Portal <ArrowUpRight className="h-3 w-3" />
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

          <nav className="flex flex-1 flex-col overflow-y-auto px-5 py-6">
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
          >
            <Link
              href="/contacto"
              className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black"
            >
              Hablemos <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cms"
              className="lg flex items-center justify-center gap-2 rounded-full px-5 py-3 text-[13px] font-semibold tracking-wider text-white"
            >
              Portal CMS <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
