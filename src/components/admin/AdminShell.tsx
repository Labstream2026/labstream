"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/Logo";
import { AreaSwitcher } from "@/components/AreaSwitcher";

type Props = {
  user: {
    name: string | null;
    email: string;
  };
  signOut: () => void;
  children: React.ReactNode;
};

export function AdminShell({ user, signOut, children }: Props) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
      <Link href="/admin" className="mb-8 hidden md:block">
        <Logo size={0.95} />
      </Link>

      <div className="mb-3 mt-1 rounded-xl border border-orange/30 bg-orange/[0.06] p-3">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-orange/80">
          Super Admin
        </div>
        <p className="mt-1 text-[12px] leading-snug text-white/65">
          Gestión de usuarios y permisos. Solo tú entras aquí.
        </p>
      </div>

      <div className="mb-1 mt-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Administración
      </div>
      <nav className="flex flex-col gap-0.5 text-[14px]">
        <NavLink
          href="/admin"
          label="Resumen"
          active={pathname === "/admin"}
        />
        <NavLink
          href="/admin/users"
          label="Usuarios"
          active={pathname.startsWith("/admin/users")}
        />
        <NavLink
          href="/admin/roles"
          label="Roles & permisos"
          active={pathname.startsWith("/admin/roles")}
        />
      </nav>

      <div className="mb-1 mt-6 px-3 text-[10px] font-semibold uppercase tracking-wider text-white/30">
        Saltar a
      </div>
      <nav className="flex flex-col gap-0.5 text-[14px]">
        <NavLink href="/cms" label="Portal CMS ↗" active={false} external />
        <NavLink href="/app" label="Web App ↗" active={false} external />
      </nav>
    </>
  );

  return (
    <div className="flex min-h-screen flex-col bg-[#0a0a0a] text-white">
      {/* Top tabs entre áreas (CMS / App / Admin) */}
      <AreaSwitcher
        current="admin"
        isMaster={true}
        canAccessCms={true}
        canAccessApp={true}
      />

      <div className="flex flex-1">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 flex-shrink-0 flex-col gap-1 border-r border-white/5 bg-black/30 px-3 py-6 md:flex">
          {navContent}
        </aside>

        {/* Drawer (mobile) */}
        <div className="md:hidden">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="m-3 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[13px]"
          >
            ☰ Menú
          </button>
          {open && (
            <>
              <div
                className="fixed inset-0 z-40 bg-black/60"
                onClick={() => setOpen(false)}
              />
              <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col gap-1 overflow-y-auto bg-[#0a0a0a] px-3 py-6">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="self-end p-2 text-white/55"
                >
                  ✕
                </button>
                {navContent}
              </aside>
            </>
          )}
        </div>

        <main className="flex-1">{children}</main>
      </div>

      {/* User chip + logout (top right corner) */}
      <div className="pointer-events-none fixed right-3 top-3 z-30 flex items-center gap-2 md:right-6 md:top-6">
        <div className="pointer-events-auto rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] backdrop-blur">
          <span className="text-white/55">Logueado como </span>
          <span className="font-semibold text-white">
            {user.name ?? user.email}
          </span>
        </div>
        <form action={signOut} className="pointer-events-auto">
          <button
            type="submit"
            className="rounded-full border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] text-white/65 hover:text-white"
          >
            Cerrar sesión
          </button>
        </form>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  active,
  external,
}: {
  href: string;
  label: string;
  active: boolean;
  external?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-2 transition-colors ${
        active
          ? "bg-orange/15 text-orange"
          : external
            ? "text-white/55 hover:bg-white/[0.04] hover:text-white/85"
            : "text-white/75 hover:bg-white/[0.04] hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
