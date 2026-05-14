import Link from "next/link";
import {
  ProjectStatus,
  DeliverableStatus,
  TaskStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireAppUser,
  getPrimaryAppRole,
  listVisibleProjectIds,
  STATUS_LABELS,
  DELIVERABLE_KIND_LABELS,
} from "@/lib/app-guards";
import { thumbnailFromVersion } from "@/lib/thumbnails";
import { getProjectStatsMap, type ProjectStats } from "@/lib/project-stats";
import { Avatar, AvatarStack } from "@/components/app/ui/Avatar";
import { StatusPill as UIStatusPill } from "@/components/app/ui/StatusPill";

export default async function AppDashboard() {
  const me = await requireAppUser();
  const role = await getPrimaryAppRole(me.id, me.role);
  const access = await listVisibleProjectIds(me.id, me.role);

  if (role === "CLIENT") return <ClientDashboard userId={me.id} access={access} name={me.name ?? me.email} />;
  if (role === "TEAM") return <TeamDashboard userId={me.id} access={access} name={me.name ?? me.email} />;
  return <ProducerDashboard userId={me.id} access={access} name={me.name ?? me.email} isMaster={role === "MASTER"} />;
}

// ─── CLIENTE ─────────────────────────────────────────────────

async function ClientDashboard({
  userId,
  access,
  name,
}: {
  userId: string;
  access: { all: true } | { all: false; ids: string[] };
  name: string;
}) {
  const where = access.all ? {} : { id: { in: access.ids } };

  const [pendingApprovals, projects] = await Promise.all([
    prisma.deliverable.findMany({
      where: {
        status: DeliverableStatus.CLIENT_REVIEW,
        project: where,
      },
      include: {
        project: { select: { id: true, name: true, code: true } },
        currentVersion: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    prisma.project.findMany({
      where,
      include: {
        clientOrg: { select: { name: true } },
        producerOrg: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
  ]);

  const stats = await getProjectStatsMap(projects.map((p) => p.id));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Hola
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {name.split(" ")[0]}
        </h1>
      </div>

      {pendingApprovals.length > 0 && (
        <div
          className="lg mb-10 rounded-3xl p-6"
          style={{
            border: "1px solid rgba(232,100,12,0.35)",
            background:
              "linear-gradient(180deg, rgba(232,100,12,0.08), transparent 80%)",
          }}
        >
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-widest text-orange">
            Por revisar
          </div>
          <h2
            className="mb-5 font-heading text-white"
            style={{ fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.5px" }}
          >
            Tienes {pendingApprovals.length}{" "}
            {pendingApprovals.length === 1 ? "entrega" : "entregas"} pendientes
            de revisar
          </h2>
          <div className="grid gap-3 md:grid-cols-2">
            {pendingApprovals.map((d) => {
              const thumb = thumbnailFromVersion(d.currentVersion);
              return (
                <Link
                  key={d.id}
                  href={`/app/deliverables/${d.id}`}
                  className="lg-strong group flex items-center gap-3 overflow-hidden rounded-xl p-2 pr-3 transition-colors hover:bg-white/[0.09]"
                >
                  {/* Thumbnail */}
                  <div
                    className="relative aspect-video h-16 shrink-0 overflow-hidden rounded-lg bg-black/40"
                    style={{ width: 96 }}
                  >
                    {thumb ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumb}
                        alt=""
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-orange/60" aria-hidden>
                        ▶
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10.5px] font-medium uppercase tracking-wider text-white/45">
                      {d.project.name}
                    </div>
                    <div className="truncate text-[14.5px] font-semibold text-white">
                      {d.title}
                    </div>
                    <div className="text-[11px] text-white/55">
                      {DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind}
                    </div>
                  </div>
                  <span className="shrink-0 rounded-full bg-orange px-3 py-1.5 text-[12px] font-semibold text-white">
                    Revisar
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      <h2 className="mb-4 text-[16px] font-semibold text-white">
        Tus proyectos
      </h2>
      {projects.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          Aún no tienes proyectos asignados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              stats={stats.get(p.id)}
              clientView
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── TEAM ────────────────────────────────────────────────────

async function TeamDashboard({
  userId,
  access,
  name,
}: {
  userId: string;
  access: { all: true } | { all: false; ids: string[] };
  name: string;
}) {
  const myTasks = await prisma.task.findMany({
    where: {
      assignees: { some: { userId } },
      status: { in: [TaskStatus.TODO, TaskStatus.DOING, TaskStatus.REVIEW] },
    },
    include: {
      phase: {
        include: { project: { select: { id: true, name: true, code: true } } },
      },
    },
    orderBy: [{ dueDate: "asc" }, { updatedAt: "desc" }],
    take: 12,
  });

  const where = access.all ? {} : { id: { in: access.ids } };
  const projects = await prisma.project.findMany({
    where,
    include: {
      clientOrg: { select: { name: true } },
      producerOrg: { select: { name: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: 6,
  });
  const teamStats = await getProjectStatsMap(projects.map((p) => p.id));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Tu día
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Hola, {name.split(" ")[0]}
        </h1>
      </div>

      <h2 className="mb-3 text-[16px] font-semibold text-white">
        Mis tareas pendientes ({myTasks.length})
      </h2>
      {myTasks.length === 0 ? (
        <div className="lg mb-8 rounded-2xl p-8 text-center text-[14px] text-white/55">
          No tienes tareas asignadas en este momento.
        </div>
      ) : (
        <div className="lg mb-10 overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-wider text-white/45"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="px-5 py-3 font-medium">Tarea</th>
                <th className="px-5 py-3 font-medium">Proyecto</th>
                <th className="px-5 py-3 font-medium">Fase</th>
                <th className="px-5 py-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {myTasks.map((t) => (
                <tr
                  key={t.id}
                  className="border-b text-white/85"
                  style={{ borderColor: "var(--border)" }}
                >
                  <td className="px-5 py-3 font-medium text-white">{t.title}</td>
                  <td className="px-5 py-3">
                    <Link
                      href={`/app/projects/${t.phase.project.id}`}
                      className="text-orange hover:underline"
                    >
                      {t.phase.project.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-white/70">{t.phase.name}</td>
                  <td className="px-5 py-3">
                    <UIStatusPill status={t.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h2 className="mb-3 text-[16px] font-semibold text-white">
        Mis proyectos
      </h2>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((p) => (
          <ProjectCard key={p.id} project={p} stats={teamStats.get(p.id)} />
        ))}
      </div>
    </div>
  );
}

// ─── PRODUCER / MASTER ───────────────────────────────────────

async function ProducerDashboard({
  userId,
  access,
  name,
  isMaster,
}: {
  userId: string;
  access: { all: true } | { all: false; ids: string[] };
  name: string;
  isMaster: boolean;
}) {
  const where = access.all ? {} : { id: { in: access.ids } };

  const [
    activeCount,
    waitingClientCount,
    draftCount,
    projects,
    waitingClient,
    recentActivity,
  ] = await Promise.all([
    prisma.project.count({
      where: { ...where, status: ProjectStatus.ACTIVE },
    }),
    prisma.deliverable.count({
      where: {
        project: where,
        status: DeliverableStatus.CLIENT_REVIEW,
      },
    }),
    prisma.project.count({
      where: { ...where, status: ProjectStatus.DRAFT },
    }),
    prisma.project.findMany({
      where,
      include: {
        clientOrg: { select: { name: true } },
        producerOrg: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    prisma.deliverable.findMany({
      where: {
        project: where,
        status: DeliverableStatus.CLIENT_REVIEW,
      },
      include: {
        project: { select: { id: true, name: true } },
      },
      take: 5,
    }),
    prisma.activityLog.findMany({
      where: { project: where },
      include: {
        actor: { select: { name: true, email: true } },
        project: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const producerStats = await getProjectStatsMap(projects.map((p) => p.id));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          {isMaster ? "Master · Vista global" : "Productor"}
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Hola, {name.split(" ")[0]}
        </h1>
      </div>

      <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard label="Proyectos activos" value={activeCount} href="/app/projects?status=ACTIVE" />
        <StatCard
          label="Esperando cliente"
          value={waitingClientCount}
          href="/app/projects"
          accent
        />
        <StatCard label="En borrador" value={draftCount} href="/app/projects?status=DRAFT" />
      </div>

      <div className="mb-10 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[16px] font-semibold text-white">Proyectos</h2>
            <Link href="/app/projects" className="text-[12px] text-orange hover:underline">
              Ver todos →
            </Link>
          </div>
          <div className="flex flex-col gap-3">
            {projects.map((p) => (
              <ProjectCard
                key={p.id}
                project={p}
                stats={producerStats.get(p.id)}
                compact
              />
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-[16px] font-semibold text-white">
            Esperando cliente
          </h2>
          {waitingClient.length === 0 ? (
            <div className="lg rounded-2xl p-6 text-[13px] text-white/55">
              Nada pendiente del lado cliente.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {waitingClient.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/deliverables/${d.id}`}
                  className="lg flex items-center justify-between rounded-xl px-4 py-3 hover:bg-white/[0.07]"
                >
                  <div className="min-w-0">
                    <div className="text-[12px] text-white/55">
                      {d.project.name}
                    </div>
                    <div className="truncate text-[14px] font-medium text-white">
                      {DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind} · {d.title}
                    </div>
                  </div>
                  <span className="text-[11px] text-orange">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h2 className="mb-3 text-[16px] font-semibold text-white">
          Actividad reciente
        </h2>
        <div className="lg overflow-hidden rounded-2xl">
          {recentActivity.length === 0 ? (
            <div className="p-6 text-center text-[13px] text-white/55">
              Sin actividad reciente.
            </div>
          ) : (
            <ul className="divide-y" style={{ borderColor: "var(--border)" }}>
              {recentActivity.map((a) => (
                <li
                  key={a.id}
                  className="flex flex-col gap-1 px-5 py-3 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: "var(--border)" }}
                >
                  <div className="flex flex-col">
                    <span className="text-[14px] text-white">{a.summary}</span>
                    <Link
                      href={`/app/projects/${a.project.id}`}
                      className="text-[12px] text-orange hover:underline"
                    >
                      {a.project.name}
                    </Link>
                  </div>
                  <span className="text-[11px] text-white/45">
                    {a.actor?.name ?? a.actor?.email ?? "Sistema"} ·{" "}
                    {a.createdAt.toLocaleString("es-CO", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── Componentes compartidos ──────────────────────────────────

function StatCard({
  label,
  value,
  href,
  accent,
}: {
  label: string;
  value: number;
  href: string;
  accent?: boolean;
}) {
  return (
    <Link
      href={href}
      className="lg block rounded-2xl p-6 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
      style={
        accent
          ? {
              border: "1px solid rgba(232,100,12,0.35)",
              background:
                "linear-gradient(180deg, rgba(232,100,12,0.08), transparent 80%)",
            }
          : undefined
      }
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

function ProjectCard({
  project,
  stats,
  clientView,
  compact,
}: {
  project: {
    id: string;
    name: string;
    code: string;
    status: ProjectStatus;
    dueDate: Date | null;
    clientOrg: { name: string };
    producerOrg: { name: string };
  };
  stats?: ProjectStats;
  clientView?: boolean;
  compact?: boolean;
}) {
  const next = stats?.nextDeliverable ?? null;
  const team = stats?.teamPreview ?? [];
  const pct = stats?.progressPct ?? 0;

  return (
    <Link
      href={`/app/projects/${project.id}`}
      className="lg group block overflow-hidden rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-mono tracking-wider text-white/45">
            {project.code}
          </div>
          <div className="truncate text-[16px] font-semibold text-white">
            {project.name}
          </div>
        </div>
        <UIStatusPill status={project.status} size="sm" />
      </div>

      {!compact && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-0.5 text-[11.5px] text-white/55">
          {!clientView && <span>Cliente: <span className="text-white/75">{project.clientOrg.name}</span></span>}
          <span>Productora: <span className="text-white/75">{project.producerOrg.name}</span></span>
        </div>
      )}

      {/* Progress bar */}
      {stats && stats.deliverablesTotal > 0 && (
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-[10.5px] text-white/45">
            <span>{stats.deliverablesApproved} de {stats.deliverablesTotal} aprobados</span>
            <span className="font-medium text-white/70">{pct}%</span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background:
                  pct === 100
                    ? "linear-gradient(90deg, #34C759, #7DEEA0)"
                    : pct >= 50
                    ? "linear-gradient(90deg, #E8640C, #FFB57A)"
                    : "linear-gradient(90deg, #7B61FF, #B6A4FF)",
              }}
            />
          </div>
        </div>
      )}

      {/* Próximo entregable */}
      {next && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5">
          <span className="text-[10px] uppercase tracking-wider text-white/45">Próximo</span>
          <span className="truncate text-[12px] font-medium text-white/85">{next.title}</span>
          <span className="ml-auto">
            <UIStatusPill status={next.status} size="sm" showIcon={false} />
          </span>
        </div>
      )}

      {/* Equipo + entrega */}
      <div className="mt-4 flex items-center justify-between gap-3">
        {team.length > 0 ? (
          <AvatarStack people={team} size="xs" max={4} />
        ) : (
          <span className="text-[10.5px] text-white/35">Sin equipo asignado</span>
        )}
        {project.dueDate && (
          <span className="text-[11px] text-white/55">
            Entrega: <span className="text-white/85">
              {project.dueDate.toLocaleDateString("es-CO", {
                day: "2-digit",
                month: "short",
              })}
            </span>
          </span>
        )}
      </div>
    </Link>
  );
}
