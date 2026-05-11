"use client";

import Link from "next/link";

type Area = "cms" | "app" | "admin";

type Props = {
  /** Área actual donde se muestra el switcher */
  current: Area;
  /** Si el usuario es ADMIN/SUPER_ADMIN — sólo ellos ven la pestaña Super Admin */
  isMaster: boolean;
  /** Si el usuario tiene acceso al CMS (ADMIN, CMS_EDITOR, CMS_REVIEWER) */
  canAccessCms: boolean;
  /** Si el usuario tiene acceso al webapp (todos los kinds excepto sólo CMS) */
  canAccessApp: boolean;
};

/**
 * Tabs grandes que se muestran arriba de cada shell admin (CMS, Webapp, Super Admin).
 * El usuario sólo ve las pestañas a las que tiene acceso.
 */
export function AreaSwitcher({
  current,
  isMaster,
  canAccessCms,
  canAccessApp,
}: Props) {
  const tabs: { id: Area; label: string; sub: string; href: string; show: boolean }[] = [
    {
      id: "cms",
      label: "Portal CMS",
      sub: "Editar la web pública",
      href: "/cms",
      show: canAccessCms,
    },
    {
      id: "app",
      label: "Web App",
      sub: "Proyectos · clientes · entregas",
      href: "/app",
      show: canAccessApp,
    },
    {
      id: "admin",
      label: "Super Admin",
      sub: "Usuarios · roles · permisos",
      href: "/admin",
      show: isMaster,
    },
  ];

  const visible = tabs.filter((t) => t.show);
  if (visible.length <= 1) return null;

  return (
    <div className="border-b border-white/5 bg-black/40 px-5 py-3 md:px-10">
      <div className="flex flex-wrap gap-2">
        {visible.map((t) => {
          const isActive = t.id === current;
          return (
            <Link
              key={t.id}
              href={t.href}
              className={`group flex flex-col rounded-xl border px-4 py-2.5 transition-all ${
                isActive
                  ? "border-orange/40 bg-orange/10"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
            >
              <span
                className={`text-[13px] font-semibold ${
                  isActive ? "text-orange" : "text-white/85 group-hover:text-white"
                }`}
              >
                {t.label}
              </span>
              <span
                className={`text-[10px] uppercase tracking-wider ${
                  isActive ? "text-orange/70" : "text-white/35"
                }`}
              >
                {t.sub}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
