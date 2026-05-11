import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory, Prisma } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { portfolioSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import { ImageField } from "@/components/cms/ImageField";
import { RowsEditor } from "@/components/cms/RowsEditor";
import { LivePreview } from "@/components/cms/LivePreview";
import { Section, Field, Input, Textarea, Select, FormActions, EditorToolbar, FormShortcuts, SectionNav } from "@/components/cms/form";

const PORTFOLIO_SECTIONS = [
  { id: "basicos", label: "Básicos" },
  { id: "media", label: "Media" },
  { id: "contenido", label: "Brief / proceso / resultado" },
  { id: "galeria", label: "Galería" },
  { id: "before-after", label: "Before / After" },
  { id: "creditos", label: "Créditos" },
  { id: "publicacion", label: "Publicación" },
];

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  COMERCIAL: "Comercial",
  DOCUMENTAL: "Documental",
  FOTOGRAFIA: "Fotografía",
  STREAMING: "Streaming",
  BRANDED_CONTENT: "Branded Content",
  REDES_SOCIALES: "Redes",
  POST_PRODUCCION: "Post-producción",
  IA: "IA",
  OTRO: "Otro",
};

type GalleryImg = { url: string; alt?: string; caption?: string };
type BeforeAfter = { before: string; after: string; label?: string };
type Credit = { role: string; name: string };

async function saveProject(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso para editar.");
    redirect("/cms/portfolio");
  }

  const id = String(formData.get("id") ?? "");
  const parsed = parseForm(portfolioSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect(`/cms/portfolio/${id}`);
  }
  const data = parsed.data;

  const exists = await prisma.portfolioProject.findFirst({
    where: { slug: data.slug, NOT: { id } },
  });
  if (exists) {
    await setError(`Ya existe un proyecto con el slug "${data.slug}".`);
    redirect(`/cms/portfolio/${id}`);
  }

  const gallery =
    data.galleryImages.length > 0
      ? (data.galleryImages as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  const beforeAfter =
    data.beforeAfter.length > 0
      ? (data.beforeAfter as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;
  const credits =
    data.credits.length > 0
      ? (data.credits as unknown as Prisma.InputJsonValue)
      : Prisma.JsonNull;

  await prisma.portfolioProject.update({
    where: { id },
    data: {
      title: data.title,
      slug: data.slug,
      client: data.client,
      category: data.category,
      year: data.year,
      excerpt: data.excerpt,
      brief: data.brief,
      process: data.process,
      result: data.result,
      coverImageUrl: data.coverImageUrl,
      videoUrl: data.videoUrl,
      galleryImages: gallery,
      beforeAfter,
      credits,
      tags: data.tags,
      featured: data.featured,
      order: data.order,
      draft: Prisma.JsonNull,
    },
  });

  revalidatePath("/portafolio");
  revalidatePath(`/portafolio/${data.slug}`);
  revalidatePath("/cms/portfolio");
  await setSuccess("Cambios guardados.");
  redirect(`/cms/portfolio/${id}`);
}

export default async function PortfolioDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;

  const project = await prisma.portfolioProject.findUnique({ where: { id } });
  if (!project) notFound();

  const gallery = (project.galleryImages as GalleryImg[] | null) ?? [];
  const ba = (project.beforeAfter as BeforeAfter[] | null) ?? [];
  const credits = (project.credits as Credit[] | null) ?? [];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <EditorToolbar
        backHref="/cms/portfolio"
        backLabel="Volver al portafolio"
        publicHref={`/portafolio/${project.slug}`}
      />

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Editar proyecto
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {project.title}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <SectionNav sections={PORTFOLIO_SECTIONS} />

        <LivePreview
          model="portfolio"
          recordId={project.id}
          previewPath={`/portafolio/${project.slug}`}
        >
        <form
          action={saveProject}
          className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8"
        >
          <input type="hidden" name="id" value={project.id} />
          <FormShortcuts />

        <Section id="basicos" title="Básicos">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Título" required>
              <Input name="title" defaultValue={project.title} required />
            </Field>
            <Field label="Slug (URL)" help="solo letras minúsculas, números y guiones">
              <Input name="slug" defaultValue={project.slug} required />
            </Field>
            <Field label="Cliente">
              <Input name="client" defaultValue={project.client ?? ""} />
            </Field>
            <Field label="Año">
              <Input name="year" type="number" defaultValue={String(project.year)} />
            </Field>
            <Field label="Categoría">
              <Select name="category" defaultValue={project.category}>
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tags" help="separados por coma">
              <Input
                name="tags"
                defaultValue={project.tags.join(", ")}
                placeholder="comercial, fútbol, color"
              />
            </Field>
          </div>
          <Field label="Excerpt" help="1-2 líneas para la card del grid">
            <Input
              name="excerpt"
              defaultValue={project.excerpt ?? ""}
              placeholder="Comercial de 30s para la campaña…"
            />
          </Field>
        </Section>

        <Section id="media" title="Media">
          <ImageField
            name="coverImageUrl"
            label="Imagen de portada"
            defaultValue={project.coverImageUrl}
            help="Aparece en la card del grid y como hero del detalle"
            aspect="video"
          />
          <Field
            label="Video URL"
            help="Vimeo, YouTube, Drive o MP4 directo. Auto-detectamos el embed."
          >
            <Input
              name="videoUrl"
              defaultValue={project.videoUrl ?? ""}
              placeholder="https://vimeo.com/123456789"
            />
          </Field>
        </Section>

        <Section id="contenido" title="Brief / proceso / resultado">
          <Field label="Brief" help="Qué pidió el cliente">
            <Textarea name="brief" defaultValue={project.brief ?? ""} rows={3} />
          </Field>
          <Field label="Proceso" help="Cómo lo abordamos">
            <Textarea name="process" defaultValue={project.process ?? ""} rows={3} />
          </Field>
          <Field label="Resultado" help="Impacto / métricas">
            <Textarea name="result" defaultValue={project.result ?? ""} rows={3} />
          </Field>
        </Section>

        <Section id="galeria" title="Galería" help="Imágenes adicionales que aparecen en el grid del detalle.">
          <RowsEditor
            name="galleryImages"
            defaultValue={gallery}
            addLabel="+ Añadir imagen"
            emptyHint="Sin imágenes en la galería."
            fields={[
              { key: "url", label: "Imagen", type: "image", span: 4 },
              { key: "alt", label: "Alt (a11y)", placeholder: "Foto del set", span: 1 },
              { key: "caption", label: "Caption", placeholder: "Día 1", span: 1 },
            ]}
          />
        </Section>

        {/* Sección 5: Before/After */}
        <Section
          id="before-after"
          title="Before / After"
          help="Parejas de imágenes para el slider comparativo del detalle."
        >
          <RowsEditor
            name="beforeAfter"
            defaultValue={ba}
            addLabel="+ Añadir comparación"
            emptyHint="Sin comparaciones."
            fields={[
              { key: "before", label: "Antes", type: "image", span: 3 },
              { key: "after", label: "Después", type: "image", span: 3 },
              { key: "label", label: "Etiqueta (opcional)", placeholder: "Color", span: 6 },
            ]}
          />
        </Section>

        <Section id="creditos" title="Créditos" help="Equipo que trabajó en el proyecto.">
          <RowsEditor
            name="credits"
            defaultValue={credits}
            addLabel="+ Añadir crédito"
            emptyHint="Sin créditos."
            fields={[
              { key: "role", label: "Rol", placeholder: "Director", span: 1 },
              { key: "name", label: "Nombre", placeholder: "Carlos Ruiz", span: 2 },
            ]}
          />
        </Section>

        <Section id="publicacion" title="Publicación">
          <div className="flex flex-wrap items-end gap-4">
            <Field label="Orden">
              <Input
                name="order"
                type="number"
                defaultValue={String(project.order)}
                className="w-24"
              />
            </Field>
            <label className="flex items-center gap-2 pb-3 text-[13px] text-white/80">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={project.featured}
              />
              Destacado en grid
            </label>
          </div>
        </Section>

          <FormActions cancelHref="/cms/portfolio" submitLabel="Guardar cambios" />
        </form>
        </LivePreview>
      </div>
    </div>
  );
}


