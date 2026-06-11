import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma, ProposalStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { proposalSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import {
  PROPOSAL_STATUS_LABELS,
  computeBudget,
  formatMoney,
  type StatItem,
  type SelectedWorkItem,
  type TreatmentSection,
  type MoodboardItem,
  type ReferenceItem,
  type TimelineItem,
  type DeliverableRow,
  type BudgetItem,
} from "@/lib/proposals";
import { ImageField } from "@/components/cms/ImageField";
import { RowsEditor } from "@/components/cms/RowsEditor";
import {
  Section,
  Field,
  Input,
  Textarea,
  Select,
  FormActions,
  EditorToolbar,
  FormShortcuts,
  SectionNav,
} from "@/components/cms/form";

const PROPOSAL_SECTIONS = [
  { id: "cabecera", label: "Cabecera" },
  { id: "portada", label: "Portada" },
  { id: "historia", label: "Historia" },
  { id: "tratamiento", label: "Tratamiento" },
  { id: "cronograma", label: "Cronograma" },
  { id: "presupuesto", label: "Presupuesto" },
  { id: "cierre", label: "Cierre" },
];

function asJson(arr: unknown[]): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return arr.length > 0 ? (arr as unknown as Prisma.InputJsonValue) : Prisma.JsonNull;
}

async function saveProposal(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso para editar.");
    redirect("/cms/proposals");
  }

  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(proposalSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect(`/cms/proposals/${id}`);
  }
  const data = parsed.data;

  const exists = await prisma.proposal.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (exists) {
    await setError(`Ya existe una propuesta con el slug "${data.slug}".`);
    redirect(`/cms/proposals/${id}`);
  }

  await prisma.proposal.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      code: data.code,
      status: data.status,
      clientName: data.clientName,
      clientContact: data.clientContact,
      clientEmail: data.clientEmail,
      preparedBy: data.preparedBy,
      coverImageUrl: data.coverImageUrl,
      tagline: data.tagline,
      intro: data.intro,
      aboutHeading: data.aboutHeading,
      aboutBody: data.aboutBody,
      stats: asJson(data.stats),
      selectedWork: asJson(data.selectedWork),
      treatmentHeading: data.treatmentHeading,
      treatmentBody: data.treatmentBody,
      treatmentSections: asJson(data.treatmentSections),
      moodboard: asJson(data.moodboard),
      references: asJson(data.references),
      timeline: asJson(data.timeline),
      deliverables: asJson(data.deliverables),
      currency: data.currency,
      budgetItems: asJson(data.budgetItems),
      budgetNote: data.budgetNote,
      taxRatePct: data.taxRatePct,
      showPrices: data.showPrices,
      ctaHeading: data.ctaHeading,
      ctaBody: data.ctaBody,
      validUntil: data.validUntil,
      accentColor: data.accentColor,
    },
  });

  revalidatePath(`/propuesta/${data.slug}`);
  revalidatePath("/cms/proposals");
  await setSuccess("Cambios guardados.");
  redirect(`/cms/proposals/${id}`);
}

export default async function ProposalEditPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;

  const p = await prisma.proposal.findUnique({ where: { id } });
  if (!p) notFound();

  const stats = (p.stats as StatItem[] | null) ?? [];
  const selectedWork = (p.selectedWork as SelectedWorkItem[] | null) ?? [];
  const treatmentSections = (p.treatmentSections as TreatmentSection[] | null) ?? [];
  const moodboard = (p.moodboard as MoodboardItem[] | null) ?? [];
  const references = (p.references as ReferenceItem[] | null) ?? [];
  const timeline = (p.timeline as TimelineItem[] | null) ?? [];
  const deliverables = (p.deliverables as DeliverableRow[] | null) ?? [];
  const budgetItems = (p.budgetItems as BudgetItem[] | null) ?? [];

  const budget = computeBudget(budgetItems, p.taxRatePct);
  const validUntilValue = p.validUntil
    ? p.validUntil.toISOString().slice(0, 10)
    : "";

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <EditorToolbar
        backHref="/cms/proposals"
        backLabel="Volver a propuestas"
        publicHref={`/propuesta/${p.slug}`}
        publicLabel="Ver propuesta ↗"
      />

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Editar propuesta · {p.clientName}
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {p.title}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <SectionNav sections={PROPOSAL_SECTIONS} />

        <form action={saveProposal} className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8">
          <input type="hidden" name="id" value={p.id} />
          <FormShortcuts />

          {/* ── Cabecera ── */}
          <Section id="cabecera" title="Cabecera y destinatario">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Título" required>
                <Input name="title" defaultValue={p.title} required />
              </Field>
              <Field label="Slug (URL)" help="Parte final del link público /propuesta/…">
                <Input name="slug" defaultValue={p.slug} required />
              </Field>
              <Field label="Cliente" required>
                <Input name="clientName" defaultValue={p.clientName} required />
              </Field>
              <Field label="Código" help="Referencia interna, ej PROP-2026-001">
                <Input name="code" defaultValue={p.code ?? ""} />
              </Field>
              <Field label="Contacto del cliente">
                <Input
                  name="clientContact"
                  defaultValue={p.clientContact ?? ""}
                  placeholder="Marta Salinas · Brand Manager"
                />
              </Field>
              <Field label="Email del cliente">
                <Input
                  name="clientEmail"
                  type="email"
                  defaultValue={p.clientEmail ?? ""}
                  placeholder="marta@cliente.com"
                />
              </Field>
              <Field label="Preparada por">
                <Input
                  name="preparedBy"
                  defaultValue={p.preparedBy ?? ""}
                  placeholder="Lucía Pérez · Labstream"
                />
              </Field>
              <Field label="Estado">
                <Select name="status" defaultValue={p.status}>
                  {Object.entries(PROPOSAL_STATUS_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </Section>

          {/* ── Portada ── */}
          <Section id="portada" title="Portada" help="Lo primero que ve el cliente al abrir el link.">
            <ImageField
              name="coverImageUrl"
              label="Imagen de portada"
              defaultValue={p.coverImageUrl}
              help="16:9 recomendado. Aparece a pantalla completa detrás del título."
              aspect="video"
            />
            <Field label="Tagline" help="Subtítulo grande bajo el título en la portada">
              <Input
                name="tagline"
                defaultValue={p.tagline ?? ""}
                placeholder="Una idea fresca para conectar con tu audiencia"
              />
            </Field>
            <Field label="Intro / carta de apertura" help="Un párrafo cálido que abre la propuesta">
              <Textarea name="intro" defaultValue={p.intro ?? ""} rows={4} />
            </Field>
          </Section>

          {/* ── Historia ── */}
          <Section
            id="historia"
            title="Historia y track record"
            help="Quiénes son, qué han hecho y por qué confiar en Labstream."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Encabezado">
                <Input name="aboutHeading" defaultValue={p.aboutHeading ?? ""} />
              </Field>
            </div>
            <Field label="Texto" help="Historia de la productora / por qué son los indicados">
              <Textarea name="aboutBody" defaultValue={p.aboutBody ?? ""} rows={4} />
            </Field>
            <Field label="Cifras destacadas" help="Números que generan confianza (años, proyectos, marcas).">
              <RowsEditor
                name="stats"
                defaultValue={stats}
                addLabel="+ Añadir cifra"
                emptyHint="Sin cifras."
                fields={[
                  { key: "value", label: "Valor", placeholder: "120+", span: 1 },
                  { key: "label", label: "Etiqueta", placeholder: "Proyectos entregados", span: 2 },
                ]}
              />
            </Field>
            <Field label="Trabajos seleccionados" help="Casos relevantes para este cliente.">
              <RowsEditor
                name="selectedWork"
                defaultValue={selectedWork}
                addLabel="+ Añadir trabajo"
                emptyHint="Sin trabajos seleccionados."
                fields={[
                  { key: "imageUrl", label: "Imagen", type: "image", span: 2 },
                  { key: "title", label: "Título", placeholder: "Campaña verano", span: 2 },
                  { key: "client", label: "Cliente", placeholder: "PepsiCo", span: 2 },
                ]}
              />
            </Field>
          </Section>

          {/* ── Tratamiento ── */}
          <Section
            id="tratamiento"
            title="Tratamiento creativo"
            help="El concepto: idea, look & feel, referencias."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Encabezado">
                <Input name="treatmentHeading" defaultValue={p.treatmentHeading ?? ""} />
              </Field>
            </div>
            <Field label="Concepto general" help="La idea central en un par de párrafos">
              <Textarea name="treatmentBody" defaultValue={p.treatmentBody ?? ""} rows={4} />
            </Field>
            <Field label="Secciones del tratamiento" help="Bloques de concepto con imagen opcional (look, tono, dirección de arte…).">
              <RowsEditor
                name="treatmentSections"
                defaultValue={treatmentSections}
                addLabel="+ Añadir sección"
                emptyHint="Sin secciones."
                fields={[
                  { key: "heading", label: "Título", placeholder: "Dirección de arte", span: 2 },
                  { key: "body", label: "Descripción", type: "textarea", span: 4 },
                  { key: "imageUrl", label: "Imagen", type: "image", span: 6 },
                ]}
              />
            </Field>
            <Field label="Moodboard" help="Imágenes de referencia visual.">
              <RowsEditor
                name="moodboard"
                defaultValue={moodboard}
                addLabel="+ Añadir imagen"
                emptyHint="Sin imágenes."
                fields={[
                  { key: "url", label: "Imagen", type: "image", span: 4 },
                  { key: "alt", label: "Alt", placeholder: "Tono cálido", span: 2 },
                ]}
              />
            </Field>
            <Field label="Videos de referencia" help="Links de Vimeo/YouTube que ejemplifican el tono.">
              <RowsEditor
                name="references"
                defaultValue={references}
                addLabel="+ Añadir referencia"
                emptyHint="Sin referencias."
                fields={[
                  { key: "title", label: "Título", placeholder: "Referencia de ritmo", span: 2 },
                  { key: "url", label: "URL", placeholder: "https://vimeo.com/…", span: 4 },
                ]}
              />
            </Field>
          </Section>

          {/* ── Cronograma ── */}
          <Section
            id="cronograma"
            title="Cronograma y entregables"
            help="Las fases del proyecto y qué recibe el cliente."
          >
            <Field label="Cronograma" help="Fases con fecha o duración.">
              <RowsEditor
                name="timeline"
                defaultValue={timeline}
                addLabel="+ Añadir fase"
                emptyHint="Sin fases."
                fields={[
                  { key: "phase", label: "Fase", placeholder: "Pre-producción", span: 2 },
                  { key: "dateLabel", label: "Fecha / duración", placeholder: "2 semanas", span: 2 },
                  { key: "desc", label: "Detalle", type: "textarea", span: 2 },
                ]}
              />
            </Field>
            <Field label="Entregables" help="Qué recibe el cliente al final.">
              <RowsEditor
                name="deliverables"
                defaultValue={deliverables}
                addLabel="+ Añadir entregable"
                emptyHint="Sin entregables."
                fields={[
                  { key: "item", label: "Entregable", placeholder: "Comercial máster 4K", span: 2 },
                  { key: "detail", label: "Detalle", placeholder: "16:9 + 9:16 + 1:1", span: 3 },
                  { key: "qty", label: "Cant.", placeholder: "1", span: 1 },
                ]}
              />
            </Field>
          </Section>

          {/* ── Presupuesto ── */}
          <Section id="presupuesto" title="Presupuesto" help="Líneas de costo. El total se calcula solo.">
            <div className="flex flex-wrap items-end gap-4">
              <Field label="Moneda">
                <Select name="currency" defaultValue={p.currency} className="w-28">
                  <option value="COP">COP</option>
                  <option value="USD">USD</option>
                  <option value="MXN">MXN</option>
                  <option value="EUR">EUR</option>
                </Select>
              </Field>
              <Field label="IVA %" help="Vacío = sin impuesto">
                <Input
                  name="taxRatePct"
                  type="number"
                  defaultValue={p.taxRatePct != null ? String(p.taxRatePct) : ""}
                  placeholder="19"
                  className="w-24"
                />
              </Field>
              <label className="flex items-center gap-2 pb-3 text-[13px] text-white/80">
                <input type="checkbox" name="showPrices" defaultChecked={p.showPrices} />
                Mostrar precios al cliente
              </label>
            </div>
            <RowsEditor
              name="budgetItems"
              defaultValue={budgetItems as unknown as Record<string, string>[]}
              addLabel="+ Añadir línea"
              emptyHint="Sin líneas de presupuesto."
              fields={[
                { key: "concept", label: "Concepto", placeholder: "Pre-producción", span: 2 },
                { key: "detail", label: "Detalle", placeholder: "Casting + locaciones", span: 2 },
                { key: "qty", label: "Cant.", placeholder: "1", span: 1 },
                { key: "unitPrice", label: "Precio unitario", placeholder: "8000000", span: 1 },
              ]}
            />
            {budget.subtotal > 0 && (
              <div className="mt-1 flex flex-col items-end gap-0.5 text-[13px]">
                <div className="text-white/55">
                  Subtotal:{" "}
                  <span className="font-medium text-white/85">
                    {formatMoney(budget.subtotal, p.currency)}
                  </span>
                </div>
                {budget.taxRatePct > 0 && (
                  <div className="text-white/55">
                    IVA ({budget.taxRatePct}%):{" "}
                    <span className="font-medium text-white/85">
                      {formatMoney(budget.taxAmount, p.currency)}
                    </span>
                  </div>
                )}
                <div className="text-[15px] font-semibold text-orange">
                  Total: {formatMoney(budget.total, p.currency)}
                </div>
              </div>
            )}
            <Field label="Nota del presupuesto" help="Condiciones, qué incluye/excluye, forma de pago.">
              <Textarea name="budgetNote" defaultValue={p.budgetNote ?? ""} rows={3} />
            </Field>
          </Section>

          {/* ── Cierre ── */}
          <Section id="cierre" title="Cierre">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Encabezado del cierre">
                <Input name="ctaHeading" defaultValue={p.ctaHeading ?? ""} placeholder="¿Avanzamos?" />
              </Field>
              <Field label="Válida hasta" help="Fecha de vencimiento de la propuesta">
                <Input name="validUntil" type="date" defaultValue={validUntilValue} />
              </Field>
              <Field label="Color de acento" help="Opcional. Hex, ej #E8640C">
                <Input name="accentColor" defaultValue={p.accentColor ?? ""} placeholder="#E8640C" />
              </Field>
            </div>
            <Field label="Mensaje de cierre">
              <Textarea name="ctaBody" defaultValue={p.ctaBody ?? ""} rows={3} />
            </Field>
          </Section>

          <FormActions cancelHref="/cms/proposals" submitLabel="Guardar cambios" />
        </form>
      </div>
    </div>
  );
}
