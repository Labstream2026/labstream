import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { ImageField } from "@/components/cms/ImageField";
import { RowsEditor } from "@/components/cms/RowsEditor";
import { LivePreview } from "@/components/cms/LivePreview";
import { Section, Field, Input, Textarea, FormActions, EditorToolbar } from "@/components/cms/form";

type Capability = { icon: string; title: string; desc: string };
type ProcessStep = { step: string; title: string; desc: string };

function parseRowsJson<T extends Record<string, string>>(
  raw: string,
  defaults: Record<keyof T, string>,
  required: keyof T,
): T[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((r) => r && typeof r === "object")
      .map((r) => {
        const out = {} as T;
        for (const k in defaults) {
          out[k] = (String(r[k] ?? defaults[k]).trim() || defaults[k]) as T[Extract<
            keyof T,
            string
          >];
        }
        return out;
      })
      .filter((r) => String(r[required]).trim());
  } catch {
    return [];
  }
}

async function saveServiceDetail(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect(`/cms/services`);
  }

  const id = String(formData.get("id") ?? "");
  const longDescription =
    String(formData.get("longDescription") ?? "").trim() || null;
  const heroImageUrl =
    String(formData.get("heroImageUrl") ?? "").trim() || null;
  const pricing = String(formData.get("pricing") ?? "").trim() || null;

  const capArr = parseRowsJson<Capability>(
    String(formData.get("capabilities") ?? "").trim(),
    { icon: "•", title: "", desc: "" },
    "title",
  );
  const capabilities =
    capArr.length > 0
      ? (capArr as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  const procArr = parseRowsJson<ProcessStep>(
    String(formData.get("process") ?? "").trim(),
    { step: "", title: "", desc: "" },
    "title",
  );
  const process =
    procArr.length > 0
      ? (procArr as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) {
    await setError("No se encontró el servicio.");
    redirect(`/cms/services`);
  }

  await prisma.service.update({
    where: { id },
    data: {
      longDescription,
      heroImageUrl,
      pricing,
      capabilities,
      process,
      draft: Prisma.JsonNull,
    },
  });

  revalidatePath("/servicios");
  if (svc) revalidatePath(`/servicio/${svc.slug}`);
  revalidatePath(`/cms/services/${id}`);
  await setSuccess("Cambios guardados.");
  redirect(`/cms/services/${id}`);
}

export default async function ServiceDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;

  const svc = await prisma.service.findUnique({ where: { id } });
  if (!svc) notFound();

  const capabilities = (svc.capabilities as Capability[] | null) ?? [];
  const process = (svc.process as ProcessStep[] | null) ?? [];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <EditorToolbar
        backHref="/cms/services"
        backLabel="Volver a servicios"
        publicHref={`/servicio/${svc.slug}`}
      />

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Detalle de servicio
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {svc.title}
        </h1>
        <p className="mt-1 text-[13px] text-white/55">
          /{svc.slug} · Aparece en /servicio/{svc.slug}. Para cambiar título o
          resumen corto, usa la lista de servicios.
        </p>
      </div>

      <LivePreview
        model="service"
        recordId={svc.id}
        previewPath={`/servicio/${svc.slug}`}
      >
        <form
          action={saveServiceDetail}
          className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8"
        >
          <input type="hidden" name="id" value={svc.id} />

        <Section title="Hero del detalle">
          <ImageField
            name="heroImageUrl"
            label="Imagen de fondo del hero"
            defaultValue={svc.heroImageUrl}
            help="Imagen grande detrás del título"
            aspect="wide"
          />
          <Field
            label="Descripción larga"
            help="Párrafo amplio bajo el título del hero (2-4 líneas)"
          >
            <Textarea
              name="longDescription"
              defaultValue={svc.longDescription ?? ""}
              rows={4}
            />
          </Field>
        </Section>

        <Section
          title="Capacidades"
          help="Bloques que aparecen en el grid 'Capacidades' del detalle."
        >
          <RowsEditor
            name="capabilities"
            defaultValue={capabilities}
            addLabel="+ Añadir capacidad"
            emptyHint="Sin capacidades. Añade la primera abajo."
            fields={[
              { key: "icon", label: "Icono", placeholder: "🎬", span: 1 },
              { key: "title", label: "Título", placeholder: "Comerciales TV", span: 2 },
              {
                key: "desc",
                label: "Descripción",
                placeholder: "Spots de 15s a 90s",
                type: "textarea",
                span: 3,
              },
            ]}
          />
        </Section>

        <Section
          title="Proceso"
          help="Pasos numerados que aparecen como tarjetas en orden."
        >
          <RowsEditor
            name="process"
            defaultValue={process}
            addLabel="+ Añadir paso"
            emptyHint="Sin pasos. Añade el primero."
            fields={[
              { key: "step", label: "Número", placeholder: "01", span: 1 },
              { key: "title", label: "Título", placeholder: "Brief", span: 2 },
              {
                key: "desc",
                label: "Descripción",
                placeholder: "Entendemos el objetivo",
                type: "textarea",
                span: 3,
              },
            ]}
          />
        </Section>

        <Section title="Pricing">
          <Field
            label="Texto de inversión"
            help="Aparece como CTA al final del detalle"
          >
            <Input
              name="pricing"
              defaultValue={svc.pricing ?? ""}
              placeholder="Desde $XXM COP — Cotización personalizada según alcance"
            />
          </Field>
        </Section>

          <FormActions cancelHref="/cms/services" submitLabel="Guardar" />
        </form>
      </LivePreview>
    </div>
  );
}


