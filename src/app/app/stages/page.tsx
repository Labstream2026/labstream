import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/app-guards";
import { ConfirmButton } from "@/components/cms/ConfirmButton";

function safeHex(v: string): string {
  const t = v.trim();
  return /^#[0-9a-fA-F]{6}$/.test(t) ? t : "#9aa0a6";
}

function slugKey(label: string): string {
  return (
    label
      .toUpperCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 30) || "STAGE"
  );
}

async function createStage(formData: FormData) {
  "use server";
  await requireMaster();
  const label = String(formData.get("label") ?? "").trim();
  if (!label) redirect("/app/stages");
  const color = safeHex(String(formData.get("color") ?? ""));
  const isDone = formData.get("isDone") === "on";

  let key = slugKey(label);
  let n = 2;
  while (await prisma.taskStage.findUnique({ where: { key } })) {
    key = slugKey(label) + "_" + n;
    n++;
  }
  const top = await prisma.taskStage.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });
  await prisma.taskStage.create({
    data: { key, label, color, isDone, order: (top?.order ?? -1) + 1 },
  });
  revalidatePath("/app/stages");
  revalidatePath("/app/tasks");
  redirect("/app/stages");
}

async function saveStage(formData: FormData) {
  "use server";
  await requireMaster();
  const key = String(formData.get("key") ?? "");
  const label = String(formData.get("label") ?? "").trim();
  if (!key || !label) redirect("/app/stages");
  const color = safeHex(String(formData.get("color") ?? ""));
  const isDone = formData.get("isDone") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;
  await prisma.taskStage.update({
    where: { key },
    data: { label, color, isDone, order },
  });
  revalidatePath("/app/stages");
  revalidatePath("/app/tasks");
  redirect("/app/stages");
}

async function deleteStage(formData: FormData) {
  "use server";
  await requireMaster();
  const key = String(formData.get("key") ?? "");
  const inUse = await prisma.task.count({ where: { status: key } });
  if (inUse > 0) redirect("/app/stages?error=in_use");
  const total = await prisma.taskStage.count();
  if (total <= 1) redirect("/app/stages?error=last");
  await prisma.taskStage.delete({ where: { key } });
  revalidatePath("/app/stages");
  revalidatePath("/app/tasks");
  redirect("/app/stages");
}

export default async function StagesPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireMaster();
  const sp = await props.searchParams;

  const [stages, counts] = await Promise.all([
    prisma.taskStage.findMany({ orderBy: { order: "asc" } }),
    prisma.task.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);
  const countByKey = new Map(counts.map((c) => [c.status, c._count._all]));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Administración · Tablero
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Estados de tareas
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Personaliza las columnas del tablero: nombre, color, orden y si cuentan
          como “terminado”. Se aplican a todos los proyectos.
        </p>
      </div>

      {sp.error === "in_use" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          No se puede eliminar: hay tareas usando ese estado. Muévelas primero a
          otro estado.
        </div>
      )}
      {sp.error === "last" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          Debe quedar al menos un estado.
        </div>
      )}

      <div className="flex flex-col gap-3">
        {stages.map((s) => (
          <form
            key={s.key}
            action={saveStage}
            className="lg flex flex-wrap items-end gap-3 rounded-2xl p-4"
          >
            <input type="hidden" name="key" value={s.key} />
            <label className="flex flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                Color
              </span>
              <input
                type="color"
                name="color"
                defaultValue={s.color}
                className="h-9 w-12 cursor-pointer rounded-md border border-white/10 bg-transparent"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 180 }}>
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                Nombre
              </span>
              <input
                name="label"
                defaultValue={s.label}
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>
            <label className="flex w-20 flex-col gap-1.5">
              <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                Orden
              </span>
              <input
                name="order"
                type="number"
                defaultValue={s.order}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>
            <label className="flex items-center gap-1.5 pb-2 text-[12px] text-white/70">
              <input type="checkbox" name="isDone" defaultChecked={s.isDone} />
              Terminado
            </label>
            <span className="pb-2 text-[11px] text-white/40">
              {countByKey.get(s.key) ?? 0} tareas
            </span>
            <div className="ml-auto flex items-center gap-2 pb-1">
              <ConfirmButton
                action={deleteStage}
                hiddenFields={{ key: s.key }}
                title="Eliminar estado"
                description={
                  <>
                    ¿Eliminar el estado <strong>{s.label}</strong>? Solo se puede
                    si ninguna tarea lo usa.
                  </>
                }
                confirmLabel="Eliminar"
                ariaLabel={`Eliminar ${s.label}`}
                className="rounded-md border border-red-500/20 px-2.5 py-2 text-[11px] text-red-300 hover:bg-red-500/10"
              >
                Eliminar
              </ConfirmButton>
              <button
                type="submit"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Guardar
              </button>
            </div>
          </form>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold text-white">Nuevo estado</h2>
        <form
          action={createStage}
          className="lg flex flex-wrap items-end gap-3 rounded-2xl p-5"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Color
            </span>
            <input
              type="color"
              name="color"
              defaultValue="#5ac8fa"
              className="h-9 w-12 cursor-pointer rounded-md border border-white/10 bg-transparent"
            />
          </label>
          <label className="flex flex-1 flex-col gap-1.5" style={{ minWidth: 200 }}>
            <span className="text-[10px] font-medium uppercase tracking-wider text-white/45">
              Nombre
            </span>
            <input
              name="label"
              required
              placeholder="Ej: En aprobación"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5 pb-2 text-[12px] text-white/70">
            <input type="checkbox" name="isDone" />
            Cuenta como terminado
          </label>
          <button type="submit" className="btn-primary self-end">
            Agregar estado
          </button>
        </form>
      </div>
    </div>
  );
}
