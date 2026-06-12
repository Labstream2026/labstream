import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { ProjectStatus, PhaseStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/app-guards";

async function createProject(formData: FormData) {
  "use server";
  const me = await requireMaster();

  const name = String(formData.get("name") ?? "").trim();
  const code = String(formData.get("code") ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const clientOrgId = String(formData.get("clientOrgId") ?? "");
  const producerUserId = String(formData.get("producerUserId") ?? "");
  const templateId = String(formData.get("templateId") ?? "") || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const startDateRaw = String(formData.get("startDate") ?? "");
  const dueDateRaw = String(formData.get("dueDate") ?? "");
  const startDate = startDateRaw ? new Date(startDateRaw) : null;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;

  if (!name || !code || !clientOrgId || !producerUserId) {
    redirect("/app/projects/new?error=invalid");
  }

  // La productora es una persona (rol Productor). Para no romper el modelo de
  // permisos/notificaciones (que opera por organización), garantizamos una
  // organización-respaldo 1:1 para esa persona y la usamos como productora.
  const producerUser = await prisma.user.findUnique({
    where: { id: producerUserId },
    select: { id: true, name: true, email: true, kind: true },
  });
  if (!producerUser || producerUser.kind !== "PRODUCER") {
    redirect("/app/projects/new?error=invalid");
  }
  let producerOrg = await prisma.organization.findFirst({
    where: { type: "PRODUCER", members: { some: { userId: producerUserId } } },
    select: { id: true },
  });
  if (!producerOrg) {
    producerOrg = await prisma.organization.create({
      data: {
        name: producerUser.name ?? producerUser.email,
        type: "PRODUCER",
        members: { create: { userId: producerUserId } },
      },
      select: { id: true },
    });
  }
  const producerOrgId = producerOrg.id;

  const exists = await prisma.project.findUnique({ where: { code } });
  if (exists) redirect("/app/projects/new?error=exists");

  const project = await prisma.project.create({
    data: {
      name,
      code,
      description,
      status: ProjectStatus.DRAFT,
      clientOrgId,
      producerOrgId,
      templateId,
      startDate,
      dueDate,
      createdById: me.id,
    },
  });

  // Aplica plantilla si se eligió
  if (templateId) {
    const tpl = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: { phases: { include: { tasks: true } } },
    });
    if (tpl) {
      for (const tp of tpl.phases.sort((a, b) => a.order - b.order)) {
        const phase = await prisma.phase.create({
          data: {
            projectId: project.id,
            type: tp.type,
            name: tp.name,
            order: tp.order,
            status:
              tp.order === 0 ? PhaseStatus.ACTIVE : PhaseStatus.PENDING,
          },
        });
        for (const tt of tp.tasks.sort((a, b) => a.order - b.order)) {
          await prisma.task.create({
            data: {
              phaseId: phase.id,
              title: tt.title,
              order: tt.order,
              status: "TODO",
            },
          });
        }
      }
    }
  }

  await prisma.activityLog.create({
    data: {
      projectId: project.id,
      actorId: me.id,
      type: "PROJECT_CREATED",
      summary: "Proyecto creado",
    },
  });

  revalidatePath("/app/projects");
  revalidatePath("/app");
  redirect(`/app/projects/${project.id}`);
}

export default async function NewProjectPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireMaster();
  const sp = await props.searchParams;

  const [clients, producers, templates] = await Promise.all([
    prisma.organization.findMany({
      where: { type: "CLIENT" },
      orderBy: { name: "asc" },
    }),
    // La productora es una PERSONA (rol Productor), no una organización.
    // Listamos las personas tipo Productor activas.
    prisma.user.findMany({
      where: { kind: "PRODUCER", active: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    }),
    prisma.projectTemplate.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { phases: true } } },
    }),
  ]);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Nuevo proyecto
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Crear proyecto
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Asigna cliente, productora y elige una plantilla. Después podrás
          asignar al equipo desde la pantalla del proyecto.
        </p>
      </div>

      {sp.error === "exists" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          Ya existe un proyecto con ese código.
        </div>
      )}
      {sp.error === "invalid" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          Faltan campos requeridos.
        </div>
      )}

      <form
        action={createProject}
        className="lg grid grid-cols-1 gap-4 rounded-2xl p-6 md:grid-cols-2"
      >
        <Field name="name" label="Nombre del proyecto" required />
        <Field
          name="code"
          label="Código (URL)"
          hint="Ej: PEPSI-2026-AGRO. Solo letras, números y guiones."
          required
        />

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Cliente
          </span>
          <select
            name="clientOrgId"
            required
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
          >
            <option value="">Selecciona…</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Productora
          </span>
          <select
            name="producerUserId"
            required
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
          >
            <option value="">Selecciona…</option>
            {producers.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name ?? p.email}
              </option>
            ))}
          </select>
          {producers.length === 0 && (
            <span className="text-[11px] text-yellow-400/80">
              No hay personas tipo Productor. Crea una en{" "}
              <a href="/app/users" className="underline">
                Equipo · Personas
              </a>
              .
            </span>
          )}
        </label>

        <Field name="startDate" label="Fecha de inicio" type="date" />
        <Field name="dueDate" label="Fecha de entrega" type="date" />

        <label className="md:col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Plantilla
          </span>
          <select
            name="templateId"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
          >
            <option value="">Sin plantilla (vacío)</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} · {t._count.phases}{" "}
                {t._count.phases === 1 ? "fase" : "fases"}
              </option>
            ))}
          </select>
          <span className="text-[11px] text-white/40">
            La plantilla pre-llena las fases y tareas. Puedes editarlas después.
          </span>
        </label>

        <label className="md:col-span-2 flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Descripción
          </span>
          <textarea
            name="description"
            rows={3}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
          />
        </label>

        <div className="md:col-span-2">
          <button type="submit" className="btn-primary">
            Crear proyecto
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  hint,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
      />
      {hint && <span className="text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}
