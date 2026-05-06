import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { LeadStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

const STATUS_LABELS: Record<LeadStatus, string> = {
  NEW: "Nuevo",
  CONTACTED: "Contactado",
  WON: "Ganado",
  LOST: "Perdido",
  SPAM: "Spam",
};

const STATUS_STYLES: Record<LeadStatus, string> = {
  NEW: "bg-orange/15 text-orange border-orange/30",
  CONTACTED: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  WON: "bg-green-500/15 text-green-300 border-green-500/30",
  LOST: "bg-white/5 text-white/40 border-white/10",
  SPAM: "bg-red-500/15 text-red-300 border-red-500/30",
};

async function quickUpdateStatus(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/leads?error=denied");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  if (!Object.keys(STATUS_LABELS).includes(status)) return;

  await prisma.lead.update({
    where: { id },
    data: {
      status,
      contactedAt:
        status === LeadStatus.CONTACTED ? new Date() : undefined,
    },
  });

  revalidatePath("/cms/leads");
  redirect("/cms/leads?ok=updated");
}

export default async function LeadsListPage(props: {
  searchParams: Promise<{ ok?: string; error?: string; status?: string; q?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;
  const q = sp.q?.trim() ?? "";
  const statusFilter = Object.keys(STATUS_LABELS).includes(sp.status ?? "")
    ? (sp.status as LeadStatus)
    : null;

  const leads = await prisma.lead.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
              { message: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const counts = await prisma.lead.groupBy({
    by: ["status"],
    _count: true,
  });
  const countByStatus = Object.fromEntries(
    counts.map((c) => [c.status, c._count]),
  ) as Record<LeadStatus, number>;
  const total = counts.reduce((s, c) => s + c._count, 0);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Operaciones
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Mensajes recibidos
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Mensajes del formulario de contacto. Marca como{" "}
          <span className="text-blue-300">Contactado</span> cuando respondas, y
          como <span className="text-green-300">Ganado</span> si se convierte en
          cliente.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <form
        method="GET"
        action="/cms/leads"
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre, email o mensaje…"
          className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
        />
        {statusFilter && (
          <input type="hidden" name="status" value={statusFilter} />
        )}
        <button
          type="submit"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white hover:bg-white/10"
        >
          Buscar
        </button>
        {(q || statusFilter) && (
          <a
            href="/cms/leads"
            className="rounded-md px-3 py-2 text-[12px] text-white/55 hover:text-white"
          >
            Limpiar
          </a>
        )}
      </form>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip
          href={`/cms/leads${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          active={!statusFilter}
          label={`Todos (${total})`}
        />
        {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
          <FilterChip
            key={s}
            href={`/cms/leads?status=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={statusFilter === s}
            label={`${STATUS_LABELS[s]} (${countByStatus[s] ?? 0})`}
          />
        ))}
      </div>

      {leads.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          {q || statusFilter
            ? "No hay mensajes que coincidan con los filtros."
            : "Aún no hay mensajes. Cuando alguien escriba desde /contacto, aparecerá aquí."}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {leads.map((l) => (
            <div key={l.id} className="lg rounded-2xl p-5">
              <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${STATUS_STYLES[l.status]}`}
                    >
                      {STATUS_LABELS[l.status]}
                    </span>
                    <span className="text-[11px] text-white/40">
                      {new Date(l.createdAt).toLocaleString("es-CO", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    {l.source && (
                      <span className="text-[10px] uppercase tracking-wider text-white/35">
                        · {l.source}
                      </span>
                    )}
                  </div>
                  <div className="text-[15px] font-semibold text-white">
                    {l.name}
                  </div>
                  <a
                    href={`mailto:${l.email}`}
                    className="text-[12px] text-orange hover:underline"
                  >
                    {l.email}
                  </a>
                </div>
                <Link
                  href={`/cms/leads/${l.id}`}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
                >
                  Detalle
                </Link>
              </div>

              <div className="mb-3 line-clamp-3 whitespace-pre-wrap text-[13px] leading-relaxed text-white/70">
                {l.message}
              </div>

              <div className="flex flex-wrap gap-1.5 border-t border-white/5 pt-3">
                {(Object.keys(STATUS_LABELS) as LeadStatus[])
                  .filter((s) => s !== l.status)
                  .map((s) => (
                    <form key={s} action={quickUpdateStatus} className="inline">
                      <input type="hidden" name="id" value={l.id} />
                      <input type="hidden" name="status" value={s} />
                      <button
                        type="submit"
                        className={`rounded border px-2 py-1 text-[11px] transition-colors ${
                          s === "SPAM"
                            ? "border-red-500/20 text-red-300 hover:bg-red-500/10"
                            : "border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                        }`}
                      >
                        → {STATUS_LABELS[s]}
                      </button>
                    </form>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
        active
          ? "border-orange/40 bg-orange/15 text-orange"
          : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? ok === "updated"
      ? "Estado actualizado"
      : ok === "saved"
        ? "Cambios guardados"
        : "Listo"
    : error === "denied"
      ? "No tienes permiso"
      : "Error";
  return (
    <div
      className={`mb-6 rounded-xl border px-4 py-3 text-[13px] ${
        isOk
          ? "border-green-500/30 bg-green-500/10 text-green-200"
          : "border-red-500/30 bg-red-500/10 text-red-200"
      }`}
    >
      {text}
    </div>
  );
}
