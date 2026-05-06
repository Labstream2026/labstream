import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
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

async function saveLead(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/leads?error=denied");

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as LeadStatus;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!Object.keys(STATUS_LABELS).includes(status)) return;

  const current = await prisma.lead.findUnique({ where: { id } });
  if (!current) redirect("/cms/leads?error=invalid");

  await prisma.lead.update({
    where: { id },
    data: {
      status,
      notes,
      contactedAt:
        current?.status !== LeadStatus.CONTACTED && status === LeadStatus.CONTACTED
          ? new Date()
          : current?.contactedAt,
    },
  });

  revalidatePath("/cms/leads");
  revalidatePath(`/cms/leads/${id}`);
  redirect(`/cms/leads/${id}?ok=saved`);
}

async function deleteLead(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/leads?error=denied");
  const id = String(formData.get("id") ?? "");
  await prisma.lead.delete({ where: { id } });
  revalidatePath("/cms/leads");
  redirect("/cms/leads?ok=deleted");
}

export default async function LeadDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;
  const sp = await props.searchParams;

  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) notFound();

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6">
        <Link
          href="/cms/leads"
          className="text-[12px] text-white/55 hover:text-white"
        >
          ← Volver a mensajes
        </Link>
      </div>

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Mensaje
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {lead.name}
        </h1>
        <a
          href={`mailto:${lead.email}`}
          className="text-[14px] text-orange hover:underline"
        >
          {lead.email}
        </a>
        <div className="mt-2 text-[12px] text-white/50">
          Recibido el{" "}
          {new Date(lead.createdAt).toLocaleString("es-CO", {
            day: "2-digit",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
          {lead.source ? ` · vía ${lead.source}` : ""}
          {lead.contactedAt
            ? ` · contactado el ${new Date(lead.contactedAt).toLocaleDateString("es-CO")}`
            : ""}
        </div>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <div className="mb-6 lg rounded-2xl p-6">
        <div className="mb-2 text-[11px] uppercase tracking-wider text-white/45">
          Mensaje original
        </div>
        <div className="whitespace-pre-wrap text-[14px] leading-relaxed text-white/85">
          {lead.message}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <a
            href={`mailto:${lead.email}?subject=Re:%20Tu%20mensaje%20a%20Labstream`}
            className="btn-primary"
          >
            Responder por email
          </a>
        </div>
      </div>

      <form action={saveLead} className="lg flex flex-col gap-5 rounded-2xl p-6">
        <input type="hidden" name="id" value={lead.id} />

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Estado
          </span>
          <select
            name="status"
            defaultValue={lead.status}
            className="max-w-xs rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
          >
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
            Notas internas
          </span>
          <textarea
            name="notes"
            defaultValue={lead.notes ?? ""}
            rows={5}
            placeholder="Contexto interno: con quién se está hablando, próximos pasos, presupuesto estimado…"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white focus:border-orange/50 focus:outline-none"
          />
          <span className="text-[11px] text-white/40">
            Solo el equipo CMS las ve.
          </span>
        </label>

        <div className="flex justify-end gap-3">
          <DeleteForm id={lead.id} />
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );

  function DeleteForm({ id }: { id: string }) {
    return (
      <form action={deleteLead} className="inline">
        <input type="hidden" name="id" value={id} />
        <button
          type="submit"
          className="rounded-md border border-red-500/20 px-4 py-2.5 text-[13px] text-red-300 hover:bg-red-500/10"
        >
          Eliminar lead
        </button>
      </form>
    );
  }
}

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? ok === "saved"
      ? "Cambios guardados"
      : ok === "deleted"
        ? "Lead eliminado"
        : "Listo"
    : error === "denied"
      ? "No tienes permiso"
      : error === "invalid"
        ? "Lead no encontrado"
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
