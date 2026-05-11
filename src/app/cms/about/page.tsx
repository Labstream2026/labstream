import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { aboutSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import { Prisma } from "@prisma/client";
import { RowsEditor } from "@/components/cms/RowsEditor";
import { LivePreview } from "@/components/cms/LivePreview";
import { Field, Input, Textarea, PageHeader, FormShortcuts } from "@/components/cms/form";

type ValueItem = { icon: string; title: string; desc: string };

async function saveAbout(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/about");
  }

  const parsed = parseForm(aboutSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect("/cms/about");
  }
  const data = parsed.data;

  const values =
    data.values.length > 0
      ? (data.values as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  await prisma.aboutContent.upsert({
    where: { id: "singleton" },
    update: {
      heroEyebrow: data.heroEyebrow,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      story: data.story,
      mission: data.mission,
      vision: data.vision,
      values,
      draft: Prisma.JsonNull,
    },
    create: {
      id: "singleton",
      heroEyebrow: data.heroEyebrow,
      heroTitle: data.heroTitle,
      heroSubtitle: data.heroSubtitle,
      story: data.story,
      mission: data.mission,
      vision: data.vision,
      values,
    },
  });

  revalidatePath("/nosotros");
  revalidatePath("/cms/about");
  await setSuccess("Cambios guardados.");
  redirect("/cms/about");
}

export default async function AboutPage() {
  await requireCmsUser();

  const about = await prisma.aboutContent.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const valuesArr = (about.values as ValueItem[] | null) ?? [];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Acerca de"
        subtitle="Contenido editorial de la página /nosotros — historia, misión, visión y valores."
      />

      <LivePreview
        model="about"
        recordId="singleton"
        previewPath="/nosotros"
      >
        <form action={saveAbout} className="lg flex flex-col gap-5 rounded-2xl p-6 md:p-8">
        <FormShortcuts />
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Field
            label="Eyebrow"
            help="Texto pequeño arriba del título (ej: 'Quiénes somos')"
          >
            <Input
              name="heroEyebrow"
              defaultValue={about.heroEyebrow ?? ""}
            />
          </Field>
          <Field label="Título hero" help="El título italic principal" wide>
            <input
              name="heroTitle"
              defaultValue={about.heroTitle ?? ""}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
            />
          </Field>
        </div>

        <Field label="Subtítulo" help="Párrafo que aparece debajo del título">
          <Textarea
            name="heroSubtitle"
            defaultValue={about.heroSubtitle ?? ""}
            rows={2}
          />
        </Field>

        <Field
          label="Historia"
          help="Múltiples párrafos. Separa con líneas en blanco."
        >
          <Textarea
            name="story"
            defaultValue={about.story ?? ""}
            rows={8}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Misión">
            <Textarea
              name="mission"
              defaultValue={about.mission ?? ""}
              rows={3}
            />
          </Field>
          <Field label="Visión">
            <Textarea
              name="vision"
              defaultValue={about.vision ?? ""}
              rows={3}
            />
          </Field>
        </div>

        <Field label="Valores" help="Cada valor con icono, título y descripción.">
          <RowsEditor
            name="values"
            defaultValue={valuesArr}
            addLabel="+ Añadir valor"
            emptyHint="Sin valores definidos."
            fields={[
              { key: "icon", label: "Icono", placeholder: "🎬", span: 1 },
              { key: "title", label: "Título", placeholder: "Cine en todo", span: 2 },
              {
                key: "desc",
                label: "Descripción",
                placeholder: "Aplicamos criterio cinematográfico…",
                type: "textarea",
                span: 3,
              },
            ]}
          />
        </Field>

        <div className="flex justify-end">
          <button type="submit" className="btn-primary">
            Guardar cambios
          </button>
        </div>
      </form>
      </LivePreview>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-5 text-[12px] text-white/55">
        <div className="mb-2 font-semibold text-white/75">
          Cómo se ve esto en /nosotros
        </div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Eyebrow + Título + Subtítulo → hero con imagen de fondo.</li>
          <li>
            Historia → bloque con párrafos separados (cada línea en blanco crea un
            párrafo).
          </li>
          <li>Misión + Visión → dos cards lado a lado.</li>
          <li>Valores → grid con ícono, título y descripción.</li>
        </ul>
      </div>
    </div>
  );
}


