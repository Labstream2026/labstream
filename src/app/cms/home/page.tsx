import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { homeSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import { HOME_DEFAULTS, type HomeStat, type HomeStep } from "@/lib/home-defaults";
import { RowsEditor } from "@/components/cms/RowsEditor";
import { ImageField } from "@/components/cms/ImageField";
import { LivePreview } from "@/components/cms/LivePreview";
import {
  Field,
  Input,
  Textarea,
  Section,
  PageHeader,
  FormShortcuts,
} from "@/components/cms/form";

async function saveHome(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/home");
  }

  const parsed = parseForm(homeSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect("/cms/home");
  }
  const d = parsed.data;

  const stats =
    d.stats.length > 0
      ? (d.stats as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  const processSteps =
    d.processSteps.length > 0
      ? (d.processSteps as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  const fields = {
    heroBadgeTag: d.heroBadgeTag,
    heroBadgeText: d.heroBadgeText,
    heroTitle: d.heroTitle,
    heroSubtitle: d.heroSubtitle,
    heroCtaPrimaryLabel: d.heroCtaPrimaryLabel,
    heroCtaPrimaryHref: d.heroCtaPrimaryHref,
    heroCtaSecondaryLabel: d.heroCtaSecondaryLabel,
    heroCtaSecondaryHref: d.heroCtaSecondaryHref,
    heroBackgroundImage: d.heroBackgroundImage,
    heroBackgroundVideo: d.heroBackgroundVideo,
    stats,
    processEyebrow: d.processEyebrow,
    processTitle: d.processTitle,
    processSteps,
    ctaEyebrow: d.ctaEyebrow,
    ctaTitle: d.ctaTitle,
    ctaSubtitle: d.ctaSubtitle,
    ctaPrimaryLabel: d.ctaPrimaryLabel,
    ctaPrimaryHref: d.ctaPrimaryHref,
    ctaSecondaryLabel: d.ctaSecondaryLabel,
    ctaSecondaryHref: d.ctaSecondaryHref,
  };

  await prisma.homeContent.upsert({
    where: { id: "singleton" },
    update: { ...fields, draft: Prisma.JsonNull },
    create: { id: "singleton", ...fields },
  });

  revalidatePath("/");
  revalidatePath("/cms/home");
  await setSuccess("Home actualizada.");
  redirect("/cms/home");
}

export default async function HomeEditorPage() {
  await requireCmsUser();

  const home = await prisma.homeContent.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const statsArr = (home.stats as HomeStat[] | null) ?? HOME_DEFAULTS.stats;
  const stepsArr =
    (home.processSteps as HomeStep[] | null) ?? HOME_DEFAULTS.processSteps;

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Inicio (Home)"
        subtitle="Edita el contenido de la página principal. Activa la vista previa para ver los cambios en vivo antes de guardar."
      />

      <LivePreview model="home" recordId="singleton" previewPath="/">
        <form
          action={saveHome}
          className="lg flex flex-col gap-7 rounded-2xl p-6 md:p-8"
        >
          <FormShortcuts />

          {/* ─── HERO ─────────────────────────────────────────── */}
          <Section
            title="1 · Portada (Hero)"
            help="Lo primero que ve el visitante, a pantalla completa."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field label="Etiqueta — año" help="El recuadro blanco. Ej: 2026">
                <Input name="heroBadgeTag" defaultValue={home.heroBadgeTag ?? ""} placeholder={HOME_DEFAULTS.heroBadgeTag} />
              </Field>
              <Field label="Etiqueta — texto" help="Texto junto al año" wide>
                <Input name="heroBadgeText" defaultValue={home.heroBadgeText ?? ""} placeholder={HOME_DEFAULTS.heroBadgeText} />
              </Field>
            </div>

            <Field label="Título grande" help="El titular principal en cursiva.">
              <Input name="heroTitle" defaultValue={home.heroTitle ?? ""} placeholder={HOME_DEFAULTS.heroTitle} />
            </Field>

            <Field label="Subtítulo" help="Frase debajo del título.">
              <Textarea name="heroSubtitle" defaultValue={home.heroSubtitle ?? ""} rows={2} placeholder={HOME_DEFAULTS.heroSubtitle} />
            </Field>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Botón principal — texto">
                <Input name="heroCtaPrimaryLabel" defaultValue={home.heroCtaPrimaryLabel ?? ""} placeholder={HOME_DEFAULTS.heroCtaPrimaryLabel} />
              </Field>
              <Field label="Botón principal — enlace" help="A dónde lleva. Ej: /contacto">
                <Input name="heroCtaPrimaryHref" defaultValue={home.heroCtaPrimaryHref ?? ""} placeholder={HOME_DEFAULTS.heroCtaPrimaryHref} />
              </Field>
              <Field label="Botón secundario — texto">
                <Input name="heroCtaSecondaryLabel" defaultValue={home.heroCtaSecondaryLabel ?? ""} placeholder={HOME_DEFAULTS.heroCtaSecondaryLabel} />
              </Field>
              <Field label="Botón secundario — enlace">
                <Input name="heroCtaSecondaryHref" defaultValue={home.heroCtaSecondaryHref ?? ""} placeholder={HOME_DEFAULTS.heroCtaSecondaryHref} />
              </Field>
            </div>

            <ImageField
              name="heroBackgroundImage"
              defaultValue={home.heroBackgroundImage ?? ""}
              label="Imagen de fondo"
              help="Se muestra si no hay video (o mientras el video carga)."
              aspect="wide"
            />
            <Field label="Video de fondo (URL .mp4)" help="Opcional. Si lo pones, reemplaza la imagen. Déjalo vacío para usar solo la imagen.">
              <Input name="heroBackgroundVideo" defaultValue={home.heroBackgroundVideo ?? ""} placeholder={HOME_DEFAULTS.heroBackgroundVideo} />
            </Field>
          </Section>

          {/* ─── ESTADÍSTICAS ─────────────────────────────────── */}
          <Section
            title="2 · Estadísticas"
            help="La fila de números (ej. 12+ años). Añade o quita las que quieras."
          >
            <RowsEditor
              name="stats"
              defaultValue={statsArr}
              addLabel="+ Añadir estadística"
              emptyHint="Sin estadísticas. Añade la primera."
              fields={[
                { key: "value", label: "Número", placeholder: "12+", span: 2 },
                { key: "label", label: "Texto", placeholder: "Años de experiencia", span: 4 },
              ]}
            />
          </Section>

          {/* ─── PROCESO ──────────────────────────────────────── */}
          <Section
            title="3 · Proceso"
            help="La sección 'De la idea a la pantalla' con los pasos."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Etiqueta (eyebrow)" help="Texto pequeño naranja arriba. Se le antepone //.">
                <Input name="processEyebrow" defaultValue={home.processEyebrow ?? ""} placeholder={HOME_DEFAULTS.processEyebrow} />
              </Field>
              <Field label="Título de la sección">
                <Input name="processTitle" defaultValue={home.processTitle ?? ""} placeholder={HOME_DEFAULTS.processTitle} />
              </Field>
            </div>
            <RowsEditor
              name="processSteps"
              defaultValue={stepsArr}
              addLabel="+ Añadir paso"
              emptyHint="Sin pasos. Añade el primero."
              fields={[
                { key: "step", label: "Nº", placeholder: "01", span: 1 },
                { key: "title", label: "Título", placeholder: "Briefing", span: 2 },
                { key: "desc", label: "Descripción", placeholder: "Escuchamos tu visión y objetivos.", type: "textarea", span: 3 },
              ]}
            />
          </Section>

          {/* ─── CTA FINAL ────────────────────────────────────── */}
          <Section
            title="4 · Llamado a la acción (final)"
            help="La sección de cierre que invita a contactar."
          >
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Etiqueta (eyebrow)" help="Se le antepone //.">
                <Input name="ctaEyebrow" defaultValue={home.ctaEyebrow ?? ""} placeholder={HOME_DEFAULTS.ctaEyebrow} />
              </Field>
              <Field label="Título">
                <Input name="ctaTitle" defaultValue={home.ctaTitle ?? ""} placeholder={HOME_DEFAULTS.ctaTitle} />
              </Field>
            </div>
            <Field label="Texto">
              <Textarea name="ctaSubtitle" defaultValue={home.ctaSubtitle ?? ""} rows={2} placeholder={HOME_DEFAULTS.ctaSubtitle} />
            </Field>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field label="Botón principal — texto">
                <Input name="ctaPrimaryLabel" defaultValue={home.ctaPrimaryLabel ?? ""} placeholder={HOME_DEFAULTS.ctaPrimaryLabel} />
              </Field>
              <Field label="Botón principal — enlace">
                <Input name="ctaPrimaryHref" defaultValue={home.ctaPrimaryHref ?? ""} placeholder={HOME_DEFAULTS.ctaPrimaryHref} />
              </Field>
              <Field label="Botón secundario — texto">
                <Input name="ctaSecondaryLabel" defaultValue={home.ctaSecondaryLabel ?? ""} placeholder={HOME_DEFAULTS.ctaSecondaryLabel} />
              </Field>
              <Field label="Botón secundario — enlace">
                <Input name="ctaSecondaryHref" defaultValue={home.ctaSecondaryHref ?? ""} placeholder={HOME_DEFAULTS.ctaSecondaryHref} />
              </Field>
            </div>
          </Section>

          <div className="flex justify-end">
            <button type="submit" className="btn-primary">
              Guardar cambios
            </button>
          </div>
        </form>
      </LivePreview>

      <div className="mt-8 rounded-xl border border-white/5 bg-white/[0.02] p-5 text-[12px] text-white/55">
        <div className="mb-2 font-semibold text-white/75">Consejos</div>
        <ul className="list-disc space-y-1 pl-5">
          <li>Si dejas un campo vacío, se usa el texto por defecto (el placeholder gris).</li>
          <li>Activa <strong>“Activar vista previa”</strong> arriba para ver los cambios en vivo a la derecha.</li>
          <li>Los enlaces internos empiezan con <code>/</code> (ej. <code>/contacto</code>). Los externos con <code>https://</code>.</li>
          <li>Guarda con el botón o con <strong>Ctrl/⌘ + S</strong>.</li>
        </ul>
      </div>
    </div>
  );
}
