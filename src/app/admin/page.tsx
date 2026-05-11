import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { UserKind, LeadStatus, BlogPostStatus } from "@prisma/client";
import { requireAdminUser } from "@/lib/admin-guards";
import { USER_KIND_LABELS } from "@/lib/app-guards";

export default async function AdminDashboardPage() {
  await requireAdminUser();

  const [
    usersByKind,
    activeUsers,
    inactiveUsers,
    recentLogins,
    leadsTotal,
    leadsNew,
    publishedPosts,
    draftPosts,
    portfolioCount,
  ] = await Promise.all([
    prisma.user.groupBy({ by: ["kind"], _count: true }),
    prisma.user.count({ where: { active: true } }),
    prisma.user.count({ where: { active: false } }),
    prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, kind: true, lastLoginAt: true },
    }),
    prisma.lead.count(),
    prisma.lead.count({ where: { status: LeadStatus.NEW } }),
    prisma.blogPost.count({ where: { status: BlogPostStatus.PUBLISHED } }),
    prisma.blogPost.count({ where: { status: BlogPostStatus.DRAFT } }),
    prisma.portfolioProject.count(),
  ]);

  const kindCounts = Object.fromEntries(
    usersByKind.map((g) => [g.kind, g._count]),
  ) as Record<UserKind, number>;

  return (
    <div className="px-5 py-8 md:px-10 md:py-12">
      <div className="mb-10">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Super Admin
        </div>
        <h1
          className="mt-1 font-heading italic text-white"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-1.5px" }}
        >
          Panel de control
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Vista global del sistema. Solo el Super Admin entra acá.
        </p>
      </div>

      {/* Stats principales */}
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Usuarios activos" value={activeUsers} sub={inactiveUsers > 0 ? `${inactiveUsers} inactivos` : "todos activos"} href="/admin/users" />
        <Stat label="Mensajes recibidos" value={leadsTotal} sub={`${leadsNew} sin contestar`} href="/cms/leads" tone={leadsNew > 0 ? "alert" : "default"} />
        <Stat label="Posts publicados" value={publishedPosts} sub={`${draftPosts} en borrador`} href="/cms/blog" />
        <Stat label="Proyectos portafolio" value={portfolioCount} sub="" href="/cms/portfolio" />
      </div>

      {/* Usuarios por tipo */}
      <section className="mb-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="font-heading text-white" style={{ fontSize: 22 }}>
            Usuarios por tipo
          </h2>
          <Link
            href="/admin/users"
            className="text-[12px] text-orange hover:underline"
          >
            Gestionar →
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          {(Object.keys(USER_KIND_LABELS) as UserKind[]).map((k) => (
            <Link
              key={k}
              href={`/admin/users?kind=${k}`}
              className="lg flex flex-col gap-1 rounded-xl p-4 transition-all hover:bg-white/[0.04]"
            >
              <span className="text-[10px] font-semibold uppercase tracking-wider text-white/45">
                {USER_KIND_LABELS[k]}
              </span>
              <span
                className="font-heading italic text-white"
                style={{ fontSize: 28, lineHeight: 1 }}
              >
                {kindCounts[k] ?? 0}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Recent logins */}
      <section className="mb-10">
        <div className="mb-4">
          <h2 className="font-heading text-white" style={{ fontSize: 22 }}>
            Últimos logins
          </h2>
        </div>
        {recentLogins.length === 0 ? (
          <div className="lg rounded-xl p-5 text-[13px] text-white/55">
            Aún no hay logins registrados.
          </div>
        ) : (
          <div className="lg overflow-hidden rounded-xl">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-white/5 bg-white/[0.02] text-left text-[10px] uppercase tracking-wider text-white/45">
                  <th className="px-4 py-3">Usuario</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Último login</th>
                </tr>
              </thead>
              <tbody>
                {recentLogins.map((u) => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-white">{u.name ?? "—"}</div>
                      <div className="text-[11px] text-white/45">{u.email}</div>
                    </td>
                    <td className="px-4 py-3 text-white/75">
                      {USER_KIND_LABELS[u.kind]}
                    </td>
                    <td className="px-4 py-3 text-white/55">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString("es-CO", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Quick links */}
      <section>
        <div className="mb-4">
          <h2 className="font-heading text-white" style={{ fontSize: 22 }}>
            Atajos
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <QuickLink
            href="/admin/users?action=new"
            title="Crear usuario"
            desc="Asigna rol y permisos en un solo paso"
          />
          <QuickLink
            href="/admin/roles"
            title="Ver matriz de permisos"
            desc="Qué puede hacer cada rol"
          />
          <QuickLink
            href="/cms/appearance"
            title="Apariencia del sitio"
            desc="Logo · colores · fuentes"
          />
        </div>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
  tone = "default",
}: {
  label: string;
  value: number;
  sub: string;
  href?: string;
  tone?: "default" | "alert";
}) {
  const inner = (
    <div
      className={`lg flex flex-col gap-1 rounded-2xl p-5 ${tone === "alert" ? "border-orange/30 bg-orange/[0.05]" : ""}`}
    >
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/45">
        {label}
      </span>
      <span
        className="font-heading italic text-white"
        style={{ fontSize: 36, lineHeight: 1 }}
      >
        {value}
      </span>
      {sub && (
        <span className={`text-[11px] ${tone === "alert" ? "text-orange/85" : "text-white/45"}`}>
          {sub}
        </span>
      )}
    </div>
  );

  if (!href) return inner;
  return (
    <Link href={href} className="transition-transform hover:-translate-y-0.5">
      {inner}
    </Link>
  );
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="lg group flex flex-col gap-1 rounded-xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.04]"
    >
      <span className="text-[14px] font-semibold text-white group-hover:text-orange">
        {title} →
      </span>
      <span className="text-[12px] text-white/55">{desc}</span>
    </Link>
  );
}
