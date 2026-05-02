import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { PhaseType, ProjectRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster, PHASE_LABELS, PROJECT_ROLE_LABELS } from "@/lib/app-guards";
import { ConfirmForm } from "@/components/ConfirmForm";

async function createTemplate(formData: FormData) {
  "use server";
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  if (!name) redirect("/app/templates?error=invalid");
  await prisma.projectTemplate.create({ data: { name, description } });
  revalidatePath("/app/templates");
}

async function deleteTemplate(formData: FormData) {
  "use server";
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  await prisma.projectTemplate.delete({ where: { id } }).catch(() => null);
  revalidatePath("/app/templates");
}

async function addPhase(formData: FormData) {
  "use server";
  await requireMaster();
  const templateId = String(formData.get("templateId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? PhaseType.CUSTOM) as PhaseType;
  if (!templateId || !name) return;
  const last = await prisma.templatePhase.findFirst({
    where: { templateId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.templatePhase.create({
    data: { templateId, name, type, order: (last?.order ?? -1) + 1 },
  });
  revalidatePath("/app/templates");
}

async function deletePhase(formData: FormData) {
  "use server";
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  await prisma.templatePhase.delete({ where: { id } }).catch(() => null);
  revalidatePath("/app/templates");
}

async function addTask(formData: FormData) {
  "use server";
  await requireMaster();
  const phaseId = String(formData.get("phaseId") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const role = String(formData.get("defaultRole") ?? "") as ProjectRole | "";
  if (!phaseId || !title) return;
  const last = await prisma.templateTask.findFirst({
    where: { phaseId },
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.templateTask.create({
    data: {
      phaseId,
      title,
      defaultRole: role || null,
      order: (last?.order ?? -1) + 1,
    },
  });
  revalidatePath("/app/templates");
}

async function deleteTask(formData: FormData) {
  "use server";
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  await prisma.templateTask.delete({ where: { id } }).catch(() => null);
  revalidatePath("/app/templates");
}

export default async function TemplatesPage() {
  await requireMaster();
  const templates = await prisma.projectTemplate.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      phases: {
        orderBy: { order: "asc" },
        include: { tasks: { orderBy: { order: "asc" } } },
      },
      _count: { select: { projects: true } },
    },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Maestro
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Plantillas de proyecto
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Define plantillas con sus fases y tareas. Al crear un proyecto, se
          clonan automáticamente.
        </p>
      </div>

      <div className="flex flex-col gap-8">
        {templates.map((t) => (
          <div key={t.id} className="lg rounded-2xl p-5">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2
                  className="font-heading text-white"
                  style={{ fontSize: 24, lineHeight: 1.05 }}
                >
                  {t.name}
                </h2>
                {t.description && (
                  <p className="mt-1 text-[13px] text-white/65">
                    {t.description}
                  </p>
                )}
                <div className="mt-2 text-[11px] text-white/40">
                  {t.phases.length} fases · {t._count.projects} proyectos usando
                </div>
              </div>
              <ConfirmForm action={deleteTemplate} message="¿Eliminar esta plantilla?">
                <input type="hidden" name="id" value={t.id} />
                <button
                  type="submit"
                  className="text-[11px] text-white/45 hover:text-red-400"
                >
                  Eliminar
                </button>
              </ConfirmForm>
            </div>

            <div className="flex flex-col gap-3">
              {t.phases.map((p) => (
                <div
                  key={p.id}
                  className="rounded-xl border border-white/10 bg-white/[0.02] p-4"
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="rounded-full border border-orange/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange">
                      {PHASE_LABELS[p.type] ?? p.type}
                    </span>
                    <span className="text-[14px] font-semibold text-white">
                      {p.name}
                    </span>
                    <form action={deletePhase} className="ml-auto">
                      <input type="hidden" name="id" value={p.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-white/40 hover:text-red-400"
                      >
                        ✕ fase
                      </button>
                    </form>
                  </div>
                  <ul className="flex flex-col gap-1 mb-2">
                    {p.tasks.map((tk) => (
                      <li
                        key={tk.id}
                        className="flex items-center justify-between rounded-md border border-white/5 px-3 py-1.5 text-[13px] text-white/85"
                      >
                        <span>{tk.title}</span>
                        <div className="flex items-center gap-2">
                          {tk.defaultRole && (
                            <span className="text-[10px] text-orange">
                              {PROJECT_ROLE_LABELS[tk.defaultRole]}
                            </span>
                          )}
                          <form action={deleteTask}>
                            <input type="hidden" name="id" value={tk.id} />
                            <button
                              type="submit"
                              className="text-[11px] text-white/40 hover:text-red-400"
                            >
                              ✕
                            </button>
                          </form>
                        </div>
                      </li>
                    ))}
                  </ul>
                  <form
                    action={addTask}
                    className="flex flex-wrap gap-2 border-t pt-2"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <input type="hidden" name="phaseId" value={p.id} />
                    <input
                      required
                      name="title"
                      placeholder="+ Nueva tarea"
                      className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[12px] text-white"
                    />
                    <select
                      name="defaultRole"
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[11px] text-white"
                    >
                      <option value="">Sin rol</option>
                      {Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-white/10 bg-white/5 px-2.5 py-1.5 text-[11px] text-white hover:bg-white/10"
                    >
                      Agregar
                    </button>
                  </form>
                </div>
              ))}

              <form
                action={addPhase}
                className="flex flex-wrap items-end gap-2 border-t pt-3"
                style={{ borderColor: "var(--border)" }}
              >
                <input type="hidden" name="templateId" value={t.id} />
                <input
                  required
                  name="name"
                  placeholder="+ Nueva fase"
                  className="flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                />
                <select
                  name="type"
                  className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-[12px] text-white"
                  defaultValue={PhaseType.CUSTOM}
                >
                  {Object.entries(PHASE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[13px] text-white hover:bg-white/10"
                >
                  Agregar fase
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-3 text-[16px] font-semibold text-white">
          Nueva plantilla
        </h2>
        <form
          action={createTemplate}
          className="lg flex flex-col gap-3 rounded-2xl p-5"
        >
          <input
            required
            name="name"
            placeholder="Nombre de la plantilla (ej: Comercial 30s)"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
          />
          <textarea
            name="description"
            rows={2}
            placeholder="Descripción"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
          />
          <button type="submit" className="btn-primary self-start">
            Crear plantilla
          </button>
        </form>
      </div>
    </div>
  );
}
