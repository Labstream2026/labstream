import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, isSuperAdmin } from "@/lib/cms-guard";
import { CmsRole } from "@prisma/client";

export default async function CmsDashboard() {
  const user = await requireCmsUser();
  const showAll = isSuperAdmin(user.role);

  const [pageCount, serviceCount, userCount, recentPages] = await Promise.all([
    prisma.page.count(),
    prisma.service.count(),
    showAll ? prisma.user.count({ where: { active: true } }) : Promise.resolve(0),
    prisma.page.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      include: { updatedBy: { select: { name: true, email: true } } },
    }),
  ]);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Dashboard
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Hola, {user.name ?? user.email.split("@")[0]}
        </h1>
        <p className="mt-2 text-[14px] text-white/55">
          Rol:{" "}
          <span className="font-medium text-white/85">
            {user.role === CmsRole.SUPER_ADMIN
              ? "Super Admin"
              : user.role === CmsRole.EDITOR
                ? "Editor"
                : "Revisor"}
          </span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Páginas" value={pageCount} href="/cms/pages" />
        <StatCard label="Servicios" value={serviceCount} href="/cms/services" />
        {showAll && (
          <StatCard
            label="Usuarios activos"
            value={userCount}
            href="/cms/users"
          />
        )}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Actividad reciente
        </h2>
        <div className="lg overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-wider text-white/45"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="px-5 py-3 font-medium">Página</th>
                <th className="px-5 py-3 font-medium">Estado</th>
                <th className="px-5 py-3 font-medium">Editado por</th>
                <th className="px-5 py-3 font-medium">Cuándo</th>
              </tr>
            </thead>
            <tbody>
              {recentPages.map((p) => (
                <tr
                  key={p.id}
                  className="border-b text-white/85 transition-colors hover:bg-white/[0.02]"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-5 py-3">
                    <Link
                      href={`/cms/pages/${p.id}`}
                      className="font-medium text-white hover:text-orange"
                    >
                      {p.title}
                    </Link>
                    <div className="text-[11px] text-white/40">/{p.slug}</div>
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-5 py-3 text-white/70">
                    {p.updatedBy?.name ?? p.updatedBy?.email ?? "—"}
                  </td>
                  <td className="px-5 py-3 text-white/50">
                    {p.updatedAt.toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="lg block rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
    >
      <div className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
        {label}
      </div>
      <div
        className="mt-2 font-heading text-white"
        style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-1px" }}
      >
        {value}
      </div>
    </Link>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PUBLISHED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0", label: "Publicado" },
    DRAFT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272", label: "Borrador" },
    REVIEW: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF", label: "En revisión" },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}
