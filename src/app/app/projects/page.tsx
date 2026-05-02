import Link from "next/link";
import { ProjectStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireAppUser,
  listVisibleProjectIds,
  STATUS_LABELS,
} from "@/lib/app-guards";

const STATUS_FILTERS: { value: ProjectStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: ProjectStatus.ACTIVE, label: "Activos" },
  { value: ProjectStatus.DRAFT, label: "Borrador" },
  { value: ProjectStatus.ON_HOLD, label: "En pausa" },
  { value: ProjectStatus.COMPLETED, label: "Completados" },
];

export default async function ProjectsListPage(props: {
  searchParams: Promise<{ status?: string; client?: string; producer?: string }>;
}) {
  const me = await requireAppUser();
  const sp = await props.searchParams;
  const access = await listVisibleProjectIds(me.id, me.role);

  const where: Record<string, unknown> = {};
  if (!access.all) where.id = { in: access.ids };

  if (sp.status && sp.status !== "ALL") where.status = sp.status;
  if (sp.client) where.clientOrgId = sp.client;
  if (sp.producer) where.producerOrgId = sp.producer;

  const [projects, clients, producers] = await Promise.all([
    prisma.project.findMany({
      where,
      include: {
        clientOrg: { select: { name: true } },
        producerOrg: { select: { name: true } },
        _count: { select: { members: true, deliverables: true } },
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.organization.findMany({ where: { type: "CLIENT" }, orderBy: { name: "asc" } }),
    prisma.organization.findMany({
      where: { type: { in: ["PRODUCER", "INTERNAL"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            Proyectos
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            {access.all ? "Todos los proyectos" : "Mis proyectos"}
          </h1>
        </div>
        {access.all && (
          <Link href="/app/projects/new" className="btn-primary">
            + Nuevo proyecto
          </Link>
        )}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => {
          const active = (sp.status ?? "ALL") === f.value;
          const params = new URLSearchParams();
          if (f.value !== "ALL") params.set("status", f.value);
          if (sp.client) params.set("client", sp.client);
          if (sp.producer) params.set("producer", sp.producer);
          return (
            <Link
              key={f.value}
              href={`/app/projects?${params.toString()}`}
              className={`rounded-full border px-3 py-1.5 text-[12px] font-medium transition-colors ${
                active
                  ? "border-orange/40 bg-orange/10 text-orange"
                  : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Proyecto</th>
              <th className="px-5 py-3 font-medium">Cliente</th>
              <th className="px-5 py-3 font-medium">Productora</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Equipo</th>
              <th className="px-5 py-3 font-medium">Entrega</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr
                key={p.id}
                className="border-b text-white/85 transition-colors hover:bg-white/[0.02]"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-5 py-3">
                  <Link
                    href={`/app/projects/${p.id}`}
                    className="block hover:text-orange"
                  >
                    <div className="font-medium text-white">{p.name}</div>
                    <div className="text-[11px] font-mono tracking-wider text-white/40">
                      {p.code}
                    </div>
                  </Link>
                </td>
                <td className="px-5 py-3 text-white/75">{p.clientOrg.name}</td>
                <td className="px-5 py-3 text-white/75">
                  {p.producerOrg.name}
                </td>
                <td className="px-5 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-5 py-3 text-white/55">
                  {p._count.members} {p._count.members === 1 ? "miembro" : "miembros"}
                </td>
                <td className="px-5 py-3 text-white/55">
                  {p.dueDate
                    ? p.dueDate.toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {projects.length === 0 && (
          <div className="p-8 text-center text-[14px] text-white/55">
            No hay proyectos que coincidan con los filtros.
          </div>
        )}
      </div>

      {access.all && (clients.length > 0 || producers.length > 0) && (
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          <FilterGroup
            label="Filtrar por cliente"
            param="client"
            current={sp.client}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
            preserve={sp}
          />
          <FilterGroup
            label="Filtrar por productora"
            param="producer"
            current={sp.producer}
            options={producers.map((p) => ({ value: p.id, label: p.name }))}
            preserve={sp}
          />
        </div>
      )}
    </div>
  );
}

function FilterGroup({
  label,
  param,
  current,
  options,
  preserve,
}: {
  label: string;
  param: string;
  current?: string;
  options: { value: string; label: string }[];
  preserve: Record<string, string | undefined>;
}) {
  const buildHref = (val?: string) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(preserve)) {
      if (v && k !== param) sp.set(k, v);
    }
    if (val) sp.set(param, val);
    return `/app/projects?${sp.toString()}`;
  };
  return (
    <div className="lg rounded-xl p-3">
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <Link
          href={buildHref()}
          className={`rounded-full border px-2.5 py-1 text-[11px] ${
            !current
              ? "border-orange/40 bg-orange/10 text-orange"
              : "border-white/10 text-white/65 hover:bg-white/5"
          }`}
        >
          Todos
        </Link>
        {options.map((o) => (
          <Link
            key={o.value}
            href={buildHref(o.value)}
            className={`rounded-full border px-2.5 py-1 text-[11px] ${
              current === o.value
                ? "border-orange/40 bg-orange/10 text-orange"
                : "border-white/10 text-white/65 hover:bg-white/5"
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string }> = {
    ACTIVE: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
    DRAFT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272" },
    ON_HOLD: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    COMPLETED: { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" },
    CANCELLED: { bg: "rgba(239,68,68,0.13)", color: "#FCA5A5" },
  };
  const s = map[status] ?? { bg: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.7)" };
  return (
    <span
      className="inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
