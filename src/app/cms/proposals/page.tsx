import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProposalStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { proposalCreateSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import {
  PROPOSAL_STATUS_LABELS,
  PROPOSAL_STATUS_STYLES,
  makeProposalSlug,
  computeBudget,
  formatMoney,
  type BudgetItem,
} from "@/lib/proposals";
import { PageHeader, FormShortcuts } from "@/components/cms/form";
import { ConfirmButton } from "@/components/cms/ConfirmButton";

async function createProposal(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso para crear propuestas.");
    redirect("/cms/proposals");
  }

  const parsed = parseForm(proposalCreateSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect("/cms/proposals");
  }
  const data = parsed.data;

  let slug = makeProposalSlug(`${data.clientName}-${data.title}`);
  // Garantiza unicidad (muy improbable colisión, pero por si acaso).
  while (await prisma.proposal.findUnique({ where: { slug } })) {
    slug = makeProposalSlug(`${data.clientName}-${data.title}`);
  }

  const created = await prisma.proposal.create({
    data: {
      slug,
      title: data.title,
      clientName: data.clientName,
      code: data.code,
      createdById: me.id,
      // Valores de arranque para que la propuesta luzca bien desde el inicio.
      tagline: data.title,
      aboutHeading: "Quiénes somos",
      treatmentHeading: "El tratamiento",
      ctaHeading: "¿Avanzamos?",
    },
  });

  await setSuccess("Propuesta creada — completa las secciones abajo.");
  redirect(`/cms/proposals/${created.id}`);
}

async function deleteProposal(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/proposals");
  }
  const id = String(formData.get("id") ?? "");
  await prisma.proposal.delete({ where: { id } }).catch(() => null);
  revalidatePath("/cms/proposals");
  await setSuccess("Propuesta eliminada.");
  redirect("/cms/proposals");
}

export default async function ProposalsListPage(props: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;
  const q = sp.q?.trim() ?? "";
  // Validar el filtro contra el enum (evita errores de Prisma con valores raros).
  const status =
    sp.status && (Object.values(ProposalStatus) as string[]).includes(sp.status)
      ? (sp.status as ProposalStatus)
      : undefined;

  const proposals = await prisma.proposal.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { clientName: { contains: q, mode: "insensitive" as const } },
              { code: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: "desc" },
  });

  const totalCount = await prisma.proposal.count();

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Comercial"
        title="Propuestas"
        subtitle="Documentos de venta que compartes con cada cliente en una URL propia. Incluyen historia, tratamiento creativo, cronograma y presupuesto."
      />

      <form
        method="GET"
        action="/cms/proposals"
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, cliente o código…"
          className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
        />
        {status && <input type="hidden" name="status" value={status} />}
        <button
          type="submit"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white hover:bg-white/10"
        >
          Buscar
        </button>
        {(q || status) && (
          <Link
            href="/cms/proposals"
            className="rounded-md px-3 py-2 text-[12px] text-white/55 hover:text-white"
          >
            Limpiar
          </Link>
        )}
      </form>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip href="/cms/proposals" active={!status} label={`Todas (${totalCount})`} />
        {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => (
          <FilterChip
            key={k}
            href={`/cms/proposals?status=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={status === k}
            label={v}
          />
        ))}
      </div>

      <div className="mb-8 grid grid-cols-1 gap-3">
        {proposals.length === 0 && (
          <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
            {q || status
              ? "No hay propuestas para ese filtro."
              : "Aún no hay propuestas. Crea la primera abajo."}
          </div>
        )}
        {proposals.map((p) => {
          const { total } = computeBudget(
            p.budgetItems as BudgetItem[] | null,
            p.taxRatePct,
          );
          const st = PROPOSAL_STATUS_STYLES[p.status];
          return (
            <div key={p.id} className="lg flex items-center gap-4 rounded-2xl p-4">
              <div className="flex h-16 w-24 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white/[0.06]">
                {p.coverImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.coverImageUrl}
                    alt={p.title}
                    className="h-full w-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="text-[10px] uppercase text-white/30">Sin portada</span>
                )}
              </div>

              <div className="flex flex-1 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ background: st.bg, color: st.color }}
                  >
                    {PROPOSAL_STATUS_LABELS[p.status]}
                  </span>
                  {p.code && (
                    <span className="font-mono text-[10px] tracking-wider text-white/40">
                      {p.code}
                    </span>
                  )}
                </div>
                <div className="text-[15px] font-semibold text-white">{p.title}</div>
                <div className="text-[12px] text-white/55">
                  {p.clientName}
                  {total > 0 && (
                    <> · <span className="text-white/75">{formatMoney(total, p.currency)}</span></>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/propuesta/${p.slug}`}
                  target="_blank"
                  className="text-[11px] text-white/40 hover:text-white"
                >
                  Ver ↗
                </Link>
                <Link
                  href={`/cms/proposals/${p.id}`}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
                >
                  Editar
                </Link>
                <ConfirmButton
                  action={deleteProposal}
                  hiddenFields={{ id: p.id }}
                  title="Eliminar propuesta"
                  description={
                    <>
                      ¿Quieres eliminar <strong>{p.title}</strong>? Esta acción no se
                      puede deshacer.
                    </>
                  }
                  confirmLabel="Eliminar"
                  ariaLabel="Eliminar"
                >
                  ✕
                </ConfirmButton>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">Nueva propuesta</h2>
        <form
          action={createProposal}
          className="lg flex flex-wrap items-end gap-4 rounded-2xl p-6"
        >
          <FormShortcuts />
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Título
            </span>
            <input
              name="title"
              required
              placeholder="Comercial de marca 2026"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Cliente
            </span>
            <input
              name="clientName"
              required
              placeholder="PepsiCo"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Código (opcional)
            </span>
            <input
              name="code"
              placeholder="PROP-2026-001"
              className="w-44 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <button type="submit" className="btn-primary">
            Crear y editar
          </button>
        </form>
      </div>
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
