"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { AreaSwitcher } from "@/components/AreaSwitcher";
import type { AppRole } from "@/lib/app-guards";

type Props = {
  user: {
    name: string | null;
    email: string;
  };
  role: AppRole;
  isMaster: boolean;
  signOut: () => void;
  children: React.ReactNode;
};

const NAV_BY_ROLE: Record<
  AppRole,
  { href: string; label: string; section?: "admin" }[]
> = {
  MASTER: [
    { href: "/app", label: "Inicio" },
    { href: "/app/projects", label: "Proyectos" },
    { href: "/app/users", label: "Personas", section: "admin" },
    { href: "/app/orgs", label: "Organizaciones", section: "admin" },
    { href: "/app/templates", label: "Plantillas", section: "admin" },
    { href: "/cms", label: "Ir al CMS", section: "admin" },
  ],
  PRODUCER: [
    { href: "/app", label: "Inicio" },
    { href: "/app/projects", label: "Mis proyectos" },
    { href: "/app/tasks", label: "Mis tareas" },
    { href: "/app/users", label: "Mi equipo" },
  ],
  TEAM: [
    { href: "/app", label: "Inicio" },
    { href: "/app/projects", label: "Proyectos" },
    { href: "/app/tasks", label: "Mis tareas" },
  ],
  CLIENT: [
    { href: "/app", label: "Inicio" },
    { href: "/app/approvals", label: "Por aprobar" },
    { href: "/app/projects", label: "Mis proyectos" },
  ],
};

const ROLE_LABELS: Record<AppRole, string> = {
  MASTER: "Master",
  PRODUCER: "Productor",
  TEAM: "Equipo",
  CLIENT: "Cliente",
};

export function AppShell({ user, role, isMaster, signOut, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const items = NAV_BY_ROLE[role] ?? NAV_BY_ROLE.CLIENT;

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const navContent = (
    <>
      <Link href="/app" className="mb-8 hidden md:block">
        <Logo size={0.95} />
      </Link>

      <nav className="flex flex-col gap-0.5 text-[14px]">
        {items
          .filter((i) => !i.section)
          .map((i) => (
            <NavLink
              key={i.href}
              href={i.href}
              label={i.label}
              active={
                i.href === "/app"
                  ? pathname === "/app"
                  : pathname.startsWith(i.href)
              }
            />
          ))}

        {items.some((i) => i.section === "admin") && (
          <>
            <div className="mt-4 mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
              Administración
            </div>
            {items
              .filter((i) => i.section === "admin")
              .map((i) => (
                <NavLink
                  key={i.href}
                  href={i.href}
                  label={i.label}
                  active={pathname.startsWith(i.href)}
                />
              ))}
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
          <div className="text-[11px] text-white/45">{ROLE_LABELS[role]}</div>
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
    <div className="flex min-h-screen flex-col" style={{ background: "var(--bg)" }}>
      <AreaSwitcher
        current="app"
        isMaster={isMaster}
        canAccessCms={isMaster}
        canAccessApp={true}
      />
      <div className="flex flex-1 flex-col md:flex-row">
      <header
        className="sticky top-0 z-40 flex items-center justify-between border-b px-4 py-3 md:hidden"
        style={{
          borderColor: "var(--border)",
          background: "rgba(15,15,15,0.92)",
          backdropFilter: "blur(14px)",
        }}
      >
        <Link href="/app">
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
              <Link href="/app">
                <Logo size={0.95} />
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="flex h-8 w-8 items-center justify-center rounded-md border border-white/10 text-white/70"
              >
                ✕
              </button>
            </div>
            {navContent}
          </aside>
        </div>
      )}

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
