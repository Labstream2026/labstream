import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  TaskStatus,
  PhaseStatus,
  ProjectStatus,
  ProjectRole,
  DeliverableKind,
  DeliverableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireProjectViewer,
  requireProjectManager,
  canManageProject,
  canApproveAsClient,
  PROJECT_ROLE_LABELS,
  STATUS_LABELS,
  DELIVERABLE_KIND_LABELS,
} from "@/lib/app-guards";
import { detectEmbedKind } from "@/lib/google-drive";

async function updateTaskStatus(formData: FormData) {
  "use server";
  const taskId = String(formData.get("taskId") ?? "");
  const status = String(formData.get("status") ?? TaskStatus.TODO) as TaskStatus;
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { phase: { select: { projectId: true } } },
  });
  if (!task) return;
  await requireProjectManager(task.phase.projectId);
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  revalidatePath(`/app/projects/${task.phase.projectId}`);
}

async function addTask(formData: FormData) {
  "use server";
  const phaseId = String(formData.get("phaseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!phaseId || !title) return;
  const phase = await prisma.phase.findUnique({
    where: { id: phaseId },
    select: { projectId: true },
  });
  if (!phase) return;
  await requireProjectManager(phase.projectId);
  const last = await prisma.task.findFirst({
    where: { phaseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.task.create({
    data: { phaseId, title, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath(`/app/projects/${phase.projectId}`);
}

async function addMember(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const projectRole = String(
    formData.get("projectRole") ?? ProjectRole.OTHER,
  ) as ProjectRole;
  await requireProjectManager(projectId);
  if (!userId) return;

  await prisma.projectMember
    .create({
      data: { projectId, userId, projectRole },
    })
    .catch(() => null);

  await prisma.activityLog.create({
    data: {
      projectId,
      type: "MEMBER_ADDED",
      summary: `Miembro agregado con rol ${PROJECT_ROLE_LABELS[projectRole]}`,
      actorId: (await prisma.user.findFirst({ where: { id: userId } }))?.id,
    },
  });

  revalidatePath(`/app/projects/${projectId}`);
}

async function removeMember(formData: FormData) {
  "use server";
  const memberId = String(formData.get("memberId") ?? "");
  const member = await prisma.projectMember.findUnique({
    where: { id: memberId },
  });
  if (!member) return;
  await requireProjectManager(member.projectId);
  await prisma.projectMember.delete({ where: { id: memberId } });
  revalidatePath(`/app/projects/${member.projectId}`);
}

async function updateProjectStatus(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  const status = String(formData.get("status") ?? ProjectStatus.DRAFT) as ProjectStatus;
  await requireProjectManager(projectId);
  await prisma.project.update({ where: { id: projectId }, data: { status } });
  revalidatePath(`/app/projects/${projectId}`);
  revalidatePath("/app/projects");
}

async function createDeliverable(formData: FormData) {
  "use server";
  const projectId = String(formData.get("projectId") ?? "");
  await requireProjectManager(projectId);

  const title = String(formData.get("title") ?? "").trim();
  const kind = String(formData.get("kind") ?? DeliverableKind.OTHER) as DeliverableKind;
  const phaseId = String(formData.get("phaseId") ?? "") || null;
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!title) return;

  const me = await requireProjectManager(projectId);

  const deliverable = await prisma.deliverable.create({
    data: {
      projectId,
      phaseId,
      kind,
      title,
      status: externalUrl
        ? DeliverableStatus.INTERNAL_REVIEW
        : DeliverableStatus.DRAFT,
    },
  });

  if (externalUrl) {
    const detected = detectEmbedKind(externalUrl);
    const v = await prisma.deliverableVersion.create({
      data: {
        deliverableId: deliverable.id,
        versionNumber: 1,
        externalUrl,
        embedKind: detected.kind,
        driveFolderId: detected.folderId ?? null,
        driveFileId: detected.fileId ?? null,
        notes,
        submittedById: me.id,
      },
    });
    await prisma.deliverable.update({
      where: { id: deliverable.id },
      data: { currentVersionId: v.id },
    });

    await prisma.activityLog.create({
      data: {
        projectId,
        actorId: me.id,
        type: "DELIVERABLE_SUBMITTED",
        summary: `Entregable creado: ${title}`,
      },
    });
  }

  revalidatePath(`/app/projects/${projectId}`);
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const me = await requireProjectViewer((await props.params).id);
  const { id } = await props.params;

  const isManager = await canManageProject(me.id, me.role, id);
  const isClientApprover = await canApproveAsClient(me.id, id);

  const [project, eligibleUsers] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        clientOrg: true,
        producerOrg: true,
        members: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        phases: {
          include: {
            tasks: {
              orderBy: { order: "asc" },
              include: {
                assignees: {
                  include: { user: { select: { id: true, name: true } } },
                },
              },
            },
          },
          orderBy: { order: "asc" },
        },
        deliverables: {
          include: {
            currentVersion: { select: { versionNumber: true, submittedAt: true } },
            _count: { select: { versions: true } },
          },
          orderBy: { updatedAt: "desc" },
        },
        activity: {
          include: { actor: { select: { name: true, email: true } } },
          orderBy: { createdAt: "desc" },
          take: 8,
        },
      },
    }),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  if (!project) notFound();

  const memberUserIds = new Set(project.members.map((m) => m.userId));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex items-center gap-3 text-[13px] text-white/45">
        <Link href="/app/projects" className="hover:text-white">
          Proyectos
        </Link>
        <span>/</span>
        <span className="text-white/85">{project.name}</span>
      </div>

      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="text-[12px] font-mono tracking-wider text-orange">
            {project.code}
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            {project.name}
          </h1>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/65">
            <span>
              <span className="text-white/40">Cliente:</span>{" "}
              <span className="font-medium text-white/85">
                {project.clientOrg.name}
              </span>
            </span>
            <span>
              <span className="text-white/40">Productora:</span>{" "}
              <span className="font-medium text-white/85">
                {project.producerOrg.name}
              </span>
            </span>
            {project.dueDate && (
              <span>
                <span className="text-white/40">Entrega:</span>{" "}
                <span className="font-medium text-white/85">
                  {project.dueDate.toLocaleDateString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })}
                </span>
              </span>
            )}
          </div>
          {project.description && (
            <p className="mt-3 max-w-2xl text-[14px] text-white/65">
              {project.description}
            </p>
          )}
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          {isManager ? (
            <form action={updateProjectStatus} className="flex items-center gap-2">
              <input type="hidden" name="projectId" value={project.id} />
              <select
                name="status"
                defaultValue={project.status}
                className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[12px] text-white"
              >
                <option value={ProjectStatus.DRAFT}>Borrador</option>
                <option value={ProjectStatus.ACTIVE}>Activo</option>
                <option value={ProjectStatus.ON_HOLD}>En pausa</option>
                <option value={ProjectStatus.COMPLETED}>Completado</option>
                <option value={ProjectStatus.CANCELLED}>Cancelado</option>
              </select>
              <button
                type="submit"
                className="rounded-md border border-white/10 px-2.5 py-1.5 text-[12px] font-medium text-white/80 hover:bg-white/5"
              >
                Guardar
              </button>
            </form>
          ) : (
            <StatusPill status={project.status} />
          )}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Columna izquierda: Fases y tareas */}
        <section className="lg:col-span-2 flex flex-col gap-6">
          <h2 className="text-[16px] font-semibold text-white">
            Fases y tareas
          </h2>
          {project.phases.length === 0 ? (
            <div className="lg rounded-2xl p-6 text-center text-[13px] text-white/55">
              Este proyecto aún no tiene fases. Crea desde una plantilla o
              agrega manual.
            </div>
          ) : (
            project.phases.map((ph) => (
              <PhaseBlock
                key={ph.id}
                phase={ph}
                isManager={isManager}
                onAddTask={addTask}
                onUpdateStatus={updateTaskStatus}
              />
            ))
          )}

          <h2 className="mt-6 text-[16px] font-semibold text-white">
            Entregables
          </h2>
          <div className="flex flex-col gap-3">
            {project.deliverables.length === 0 ? (
              <div className="lg rounded-2xl p-6 text-center text-[13px] text-white/55">
                No hay entregables todavía.
              </div>
            ) : (
              project.deliverables.map((d) => (
                <Link
                  key={d.id}
                  href={`/app/deliverables/${d.id}`}
                  className="lg flex items-center justify-between gap-3 rounded-2xl p-4 transition-colors hover:bg-white/[0.07]"
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-mono tracking-wider text-white/45">
                      {DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind} ·{" "}
                      {d._count.versions} versión
                      {d._count.versions === 1 ? "" : "es"}
                    </div>
                    <div className="truncate text-[15px] font-medium text-white">
                      {d.title}
                    </div>
                  </div>
                  <DeliverableStatusPill status={d.status} />
                </Link>
              ))
            )}
          </div>

          {isManager && (
            <form
              action={createDeliverable}
              className="lg flex flex-col gap-3 rounded-2xl p-5"
            >
              <h3 className="text-[14px] font-semibold text-white">
                Nuevo entregable
              </h3>
              <input type="hidden" name="projectId" value={project.id} />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input
                  required
                  name="title"
                  placeholder="Título (ej: Tratamiento v1)"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                />
                <select
                  name="kind"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                  defaultValue={DeliverableKind.ROUGH_CUT}
                >
                  {Object.entries(DELIVERABLE_KIND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  name="phaseId"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                >
                  <option value="">Sin fase</option>
                  {project.phases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  name="externalUrl"
                  placeholder="Carpeta Drive · file Drive · Vimeo · YouTube · MP4 — opcional"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white md:col-span-1"
                />
                <input
                  name="notes"
                  placeholder="Notas de versión"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white md:col-span-2"
                />
              </div>
              <button type="submit" className="btn-primary self-start">
                Crear entregable
              </button>
            </form>
          )}
        </section>

        {/* Columna derecha: Equipo + actividad */}
        <aside className="flex flex-col gap-6">
          <section className="lg rounded-2xl p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-white">
                Equipo ({project.members.length})
              </h2>
            </div>
            <ul className="flex flex-col gap-2">
              {project.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start justify-between gap-2 rounded-lg border border-white/5 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="truncate text-[13px] font-medium text-white">
                      {m.user.name ?? m.user.email}
                    </div>
                    <div className="truncate text-[11px] text-orange">
                      {PROJECT_ROLE_LABELS[m.projectRole]}
                    </div>
                  </div>
                  {isManager && (
                    <form action={removeMember}>
                      <input type="hidden" name="memberId" value={m.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-white/40 hover:text-red-400"
                        title="Quitar"
                      >
                        ✕
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>

            {isManager && (
              <form
                action={addMember}
                className="mt-4 flex flex-col gap-2 border-t pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                <input type="hidden" name="projectId" value={project.id} />
                <select
                  name="userId"
                  required
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12px] text-white"
                >
                  <option value="">Selecciona usuario…</option>
                  {eligibleUsers
                    .filter((u) => !memberUserIds.has(u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name ?? u.email}
                      </option>
                    ))}
                </select>
                <select
                  name="projectRole"
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12px] text-white"
                  defaultValue={ProjectRole.PRODUCTION_ASSISTANT}
                >
                  {Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] font-medium text-white hover:bg-white/10"
                >
                  + Agregar miembro
                </button>
              </form>
            )}
          </section>

          {project.activity.length > 0 && (
            <section className="lg rounded-2xl p-5">
              <h2 className="mb-3 text-[14px] font-semibold text-white">
                Actividad
              </h2>
              <ul className="flex flex-col gap-3 text-[12px]">
                {project.activity.map((a) => (
                  <li
                    key={a.id}
                    className="border-b pb-2 last:border-0 last:pb-0"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div className="text-white/85">{a.summary}</div>
                    <div className="mt-0.5 text-[11px] text-white/45">
                      {a.actor?.name ?? a.actor?.email ?? "Sistema"} ·{" "}
                      {a.createdAt.toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function PhaseBlock({
  phase,
  isManager,
  onAddTask,
  onUpdateStatus,
}: {
  phase: {
    id: string;
    name: string;
    type: string;
    status: PhaseStatus;
    tasks: {
      id: string;
      title: string;
      status: TaskStatus;
      assignees: { user: { name: string | null } }[];
    }[];
  };
  isManager: boolean;
  onAddTask: (formData: FormData) => Promise<void>;
  onUpdateStatus: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="lg rounded-2xl p-5">
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-[15px] font-semibold text-white">{phase.name}</h3>
        <PhaseStatusBadge status={phase.status} />
        <span className="ml-auto text-[11px] text-white/45">
          {phase.tasks.length}{" "}
          {phase.tasks.length === 1 ? "tarea" : "tareas"}
        </span>
      </div>

      {phase.tasks.length === 0 ? (
        <p className="text-[12px] text-white/45">Sin tareas todavía.</p>
      ) : (
        <ul className="flex flex-col">
          {phase.tasks.map((t) => (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b py-2 last:border-0"
              style={{ borderColor: "var(--border)" }}
            >
              <span className="flex-1 text-[13px] text-white/85">
                {t.title}
                {t.assignees.length > 0 && (
                  <span className="ml-2 text-[11px] text-white/45">
                    · {t.assignees.map((a) => a.user.name).join(", ")}
                  </span>
                )}
              </span>
              {isManager ? (
                <form action={onUpdateStatus} className="flex items-center gap-1">
                  <input type="hidden" name="taskId" value={t.id} />
                  <select
                    name="status"
                    defaultValue={t.status}
                    className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                  >
                    <option value={TaskStatus.TODO}>Por hacer</option>
                    <option value={TaskStatus.DOING}>En curso</option>
                    <option value={TaskStatus.REVIEW}>Revisión</option>
                    <option value={TaskStatus.DONE}>Listo</option>
                    <option value={TaskStatus.BLOCKED}>Bloqueado</option>
                  </select>
                  <button
                    type="submit"
                    className="rounded-md border border-white/10 px-2 py-1 text-[10px] text-white/60 hover:bg-white/5"
                  >
                    OK
                  </button>
                </form>
              ) : (
                <TaskStatusPill status={t.status} />
              )}
            </li>
          ))}
        </ul>
      )}

      {isManager && (
        <form
          action={onAddTask}
          className="mt-3 flex items-center gap-2 border-t pt-3"
          style={{ borderColor: "var(--border)" }}
        >
          <input type="hidden" name="phaseId" value={phase.id} />
          <input
            name="title"
            required
            placeholder="+ Nueva tarea…"
            className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white"
          />
          <button
            type="submit"
            className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[12px] text-white hover:bg-white/10"
          >
            Agregar
          </button>
        </form>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  return (
    <span className="inline-block rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/75">
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function PhaseStatusBadge({ status }: { status: PhaseStatus }) {
  const map: Record<PhaseStatus, { bg: string; color: string }> = {
    PENDING: { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.5)" },
    ACTIVE: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
    COMPLETED: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    ON_HOLD: { bg: "rgba(245,158,11,0.13)", color: "#FBC272" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function TaskStatusPill({ status }: { status: TaskStatus }) {
  const map: Record<TaskStatus, { bg: string; color: string }> = {
    TODO: { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" },
    DOING: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    REVIEW: { bg: "rgba(245,158,11,0.13)", color: "#FBC272" },
    DONE: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
    BLOCKED: { bg: "rgba(239,68,68,0.13)", color: "#FCA5A5" },
  };
  const s = map[status];
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}

function DeliverableStatusPill({ status }: { status: DeliverableStatus }) {
  const map: Record<DeliverableStatus, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" },
    INTERNAL_REVIEW: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    CLIENT_REVIEW: {
      bg: "rgba(232,100,12,0.15)",
      color: "var(--orange)",
    },
    CHANGES_REQUESTED: { bg: "rgba(239,68,68,0.13)", color: "#FCA5A5" },
    APPROVED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
  };
  const s = map[status];
  return (
    <span
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
