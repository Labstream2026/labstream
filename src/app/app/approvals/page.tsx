import Link from "next/link";
import { DeliverableStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireAppUser,
  listVisibleProjectIds,
  DELIVERABLE_KIND_LABELS,
} from "@/lib/app-guards";

export default async function ApprovalsPage() {
  const me = await requireAppUser();
  const access = await listVisibleProjectIds(me.id, me.role);

  const where: Record<string, unknown> = {
    status: DeliverableStatus.CLIENT_REVIEW,
  };
  if (!access.all) {
    where.project = { id: { in: access.ids } };
  }

  const items = await prisma.deliverable.findMany({
    where,
    include: {
      project: { select: { id: true, name: true, code: true } },
      currentVersion: {
        select: { versionNumber: true, submittedAt: true, externalUrl: true },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Por aprobar
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {items.length === 0
            ? "Todo al día"
            : `${items.length} ${items.length === 1 ? "entrega" : "entregas"} esperando tu revisión`}
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          No tienes entregas pendientes por aprobar. ¡Bien hecho!
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((d) => (
            <Link
              key={d.id}
              href={`/app/deliverables/${d.id}`}
              className="lg-strong group flex flex-col gap-3 rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.09]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-[11px] font-mono tracking-wider text-orange">
                    {d.project.code} · v{d.currentVersion?.versionNumber ?? "?"}
                  </div>
                  <div className="mt-0.5 truncate text-[16px] font-semibold text-white">
                    {d.title}
                  </div>
                  <div className="text-[12px] text-white/55">
                    {DELIVERABLE_KIND_LABELS[d.kind] ?? d.kind} ·{" "}
                    {d.project.name}
                  </div>
                </div>
                <span className="rounded-full bg-orange px-3 py-1.5 text-[12px] font-semibold text-white">
                  Revisar
                </span>
              </div>
              {d.currentVersion?.submittedAt && (
                <div className="text-[11px] text-white/45">
                  Enviado:{" "}
                  {d.currentVersion.submittedAt.toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
