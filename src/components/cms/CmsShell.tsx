"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";

type Props = {
  user: {
    name: string | null;
    email: string;
    role: string;
  };
  isSuper: boolean;
  signOut: () => void;
  children: React.ReactNode;
};

export function CmsShell({ user, isSuper, signOut, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navContent = (
    <>
      <Link href="/cms" className="mb-8 hidden md:block">
        <Logo size={0.95} />
      </Link>

      <div className="mb-3 mt-1 rounded-xl border border-orange/30 bg-orange/[0.06] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-orange/80">
          Estás en el CMS
        </div>
        <p className="mt-1 text-[12px] leading-snug text-white/65">
          Aquí editas el contenido de la web pública.
        </p>
        <Link
          href="/app"
          className="mt-2 inline-flex items-center gap-1.5 text-[12px] font-semibold text-orange hover:underline"
        >
          Ir a la Webapp →
        </Link>
      </div>

      <div className="mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Web pública
      </div>
      <nav className="flex flex-col gap-0.5 text-[14px]">
        <NavLink href="/cms" label="Dashboard" active={pathname === "/cms"} />
        <NavLink
          href="/cms/pages"
          label="Páginas"
          active={pathname.startsWith("/cms/pages")}
        />
        <NavLink
          href="/cms/services"
          label="Servicios"
          active={pathname.startsWith("/cms/services")}
        />
        <NavLink
          href="/cms/portfolio"
          label="Portafolio"
          active={pathname.startsWith("/cms/portfolio")}
        />
        <NavLink
          href="/cms/blog"
          label="Blog"
          active={pathname.startsWith("/cms/blog")}
        />
        <NavLink
          href="/cms/about"
          label="Acerca de"
          active={pathname.startsWith("/cms/about")}
        />
        <NavLink
          href="/cms/team"
          label="Equipo"
          active={pathname.startsWith("/cms/team")}
        />
        <NavLink
          href="/cms/testimonials"
          label="Testimonios"
          active={pathname.startsWith("/cms/testimonials")}
        />
        <NavLink
          href="/cms/logos"
          label="Logos cliente"
          active={pathname.startsWith("/cms/logos")}
        />
        <NavLink
          href="/cms/faqs"
          label="FAQs"
          active={pathname.startsWith("/cms/faqs")}
        />
        <NavLink
          href="/cms/assets"
          label="Medios"
          active={pathname.startsWith("/cms/assets")}
        />
        <NavLink
          href="/cms/appearance"
          label="Apariencia"
          active={pathname.startsWith("/cms/appearance")}
        />
        {isSuper && (
          <>
            <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Administración
            </div>
            <NavLink
              href="/app/users"
              label="Usuarios (en webapp) ↗"
              active={false}
            />
            <NavLink
              href="/cms/settings"
              label="Ajustes del sitio"
              active={pathname.startsWith("/cms/settings")}
            />
          </>
        )}
      </nav>

      <div className="mt-auto pt-6">
        <div
          className="rounded-xl border p-3"
          style={{ borderColor: "var(--border)" }}
        >
          <div className="text-[12px] font-semibold text-white">
            {user.name ?? user.email}
          </div>
          <div className="text-[11px] capitalize text-white/45">
            {user.role.toLowerCase().replace("_", " ")}
          </div>
          <button
            type="button"
            onClick={signOut}
            className="mt-3 w-full rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] font-medium text-white/70 transition-colors hover:bg-white/5 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div
      className="min-h-screen md:flex"
      style={{ background: "var(--bg)" }}
    >
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{
          borderColor: "var(--border)",
          background: "rgba(15,15,15,0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Link href="/cms">
          <Logo size={0.85} />
        </Link>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Abrir menú"
          className="flex h-9 w-9 items-center justify-center rounded-md border border-white/10 bg-white/5 text-white"
        >
          <svg
            width="16"
            height="14"
            viewBox="0 0 18 14"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          >
            <path d="M1 1h16M1 7h16M1 13h16" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div
          className="fixed inset-0 z-50 md:hidden"
          style={{ background: "rgba(0,0,0,0.6)" }}
          onClick={() => setOpen(false)}
        >
          <aside
            className="absolute left-0 top-0 flex h-full w-72 max-w-[85vw] flex-col border-r p-5"
            style={{
              background: "var(--bg-2)",
              borderColor: "var(--border)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-6 flex items-center justify-between">
              <Link href="/cms">
                <Logo size={0.95} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/70"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 14 14"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                >
                  <path d="M1 1l12 12M13 1L1 13" />
                </svg>
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside
        className="hidden w-60 flex-col border-r p-5 md:flex"
        style={{
          borderColor: "var(--border)",
          background: "var(--bg-2)",
        }}
      >
        {navContent}
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-lg px-3 py-2 font-medium transition-colors ${
        active
          ? "bg-white/10 text-white"
          : "text-white/70 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
