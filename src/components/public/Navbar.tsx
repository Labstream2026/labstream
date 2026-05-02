"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Logo } from "@/components/Logo";
import { ArrowUpRight } from "@/components/Icons";

const NAV_ITEMS = [
  { id: "home", label: "Inicio", href: "/#home" },
  { id: "portfolio", label: "Portafolio", href: "/#portfolio" },
  { id: "services", label: "Servicios", href: "/#services", hasDropdown: true },
  { id: "process", label: "Proceso", href: "/#process" },
  { id: "contact", label: "Contacto", href: "/#contact" },
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setSvcOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <>
      <nav
        className="fixed left-0 right-0 top-3 z-50 flex items-center justify-between md:top-4"
        style={{
          padding: "0 clamp(16px,4vw,64px)",
          pointerEvents: "none",
        }}
      >
        <Link href="/" style={{ pointerEvents: "all" }}>
          <Logo />
        </Link>

        {/* Desktop pill nav (hidden on mobile/tablet) */}
        <div
          className="lg hidden items-center gap-0.5 rounded-full p-[5px] lg:flex"
          style={{ pointerEvents: "all" }}
        >
          {NAV_ITEMS.map((item) =>
            item.hasDropdown ? (
              <div
                key={item.id}
                ref={ref}
                className="relative"
                onMouseEnter={() => setSvcOpen(true)}
                onMouseLeave={() => setSvcOpen(false)}
              >
                <Link
                  href={item.href}
                  className="flex items-center gap-1.5 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-white/85 transition-colors hover:text-white"
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
                    {SERVICES.map((s) => (
                      <Link
                        key={s.id}
                        href={`/servicio?id=${s.id}`}
                        className="flex items-center gap-3 border-l-2 border-transparent px-5 py-[11px] text-[12px] font-medium text-white/55 transition-all hover:border-l-orange hover:bg-white/5 hover:text-white"
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
                className="whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] font-medium text-white/85 transition-colors hover:text-white"
              >
                {item.label}
              </Link>
            ),
          )}
          <Link
            href="/#contact"
            className="ml-1.5 flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-4 py-1.5 text-[13px] font-semibold text-black transition-opacity hover:opacity-90"
          >
            Hablemos <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Desktop right side */}
        <div
          className="hidden items-center gap-2.5 lg:flex"
          style={{ pointerEvents: "all" }}
        >
          <Link
            href="/cms"
            className="lg flex items-center gap-1.5 rounded-full px-4 py-2 text-[12px] font-semibold tracking-wider text-white"
          >
            Portal <ArrowUpRight className="h-3 w-3" />
          </Link>
        </div>

        {/* Mobile hamburger button */}
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Abrir menú"
          className="lg flex h-10 w-10 items-center justify-center rounded-full lg:hidden"
          style={{ pointerEvents: "all" }}
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
                onClick={() => setMobileOpen(false)}
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

            <div
              className="mb-3 mt-6 text-[11px] font-semibold uppercase tracking-widest text-white/40"
            >
              Servicios
            </div>
            <div className="flex flex-col gap-1">
              {SERVICES.map((s) => (
                <Link
                  key={s.id}
                  href={`/servicio?id=${s.id}`}
                  onClick={() => setMobileOpen(false)}
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
              href="/#contact"
              onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-[14px] font-semibold text-black"
            >
              Hablemos <ArrowUpRight className="h-4 w-4" />
            </Link>
            <Link
              href="/cms"
              onClick={() => setMobileOpen(false)}
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
