import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAppUser } from "@/lib/app-guards";
import { getTaskStages } from "@/lib/task-stages";

export default async function TasksPage() {
  const me = await requireAppUser();

  const [tasks, stages] = await Promise.all([
    prisma.task.findMany({
      where: { assignees: { some: { userId: me.id } } },
      include: {
        phase: {
          include: { project: { select: { id: true, name: true, code: true } } },
        },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { updatedAt: "desc" }],
    }),
    getTaskStages(),
  ]);

  const grouped: Record<string, typeof tasks> = {};
  for (const s of stages) grouped[s.key] = [];
  for (const t of tasks) (grouped[t.status] ??= []).push(t);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Mis tareas
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Pendiente y en curso
        </h1>
      </div>

      {tasks.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          No tienes tareas asignadas en este momento.
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {stages.map((s) => (
            (grouped[s.key]?.length ?? 0) > 0 && (
              <div key={s.key} className="lg flex flex-col gap-2 rounded-2xl p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="flex items-center gap-1.5 text-[13px] font-semibold uppercase tracking-wider text-white/70">
                    <span
                      aria-hidden
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: s.color }}
                    />
                    {s.label}
                  </h2>
                  <span className="text-[11px] text-white/45">
                    {grouped[s.key].length}
                  </span>
                </div>
                {grouped[s.key].map((t) => (
                  <Link
                    key={t.id}
                    href={`/app/projects/${t.phase.project.id}`}
                    className="rounded-lg border border-white/5 bg-white/[0.02] p-3 transition-colors hover:bg-white/[0.05]"
                  >
                    <div className="text-[13px] font-medium text-white">
                      {t.title}
                    </div>
                    <div className="mt-1 text-[11px] text-orange">
                      {t.phase.project.name}
                    </div>
                    <div className="mt-0.5 text-[10px] text-white/45">
                      Fase: {t.phase.name}
                    </div>
                  </Link>
                ))}
              </div>
            )
          ))}
        </div>
      )}
    </div>
  );
}
