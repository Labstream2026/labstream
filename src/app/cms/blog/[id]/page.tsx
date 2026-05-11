import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus, Prisma } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { ImageField } from "@/components/cms/ImageField";
import { MarkdownEditor } from "@/components/cms/MarkdownEditor";
import { LivePreview } from "@/components/cms/LivePreview";
import { Section, Field, Input, Textarea, Select, FormActions, EditorToolbar, FormShortcuts, SectionNav } from "@/components/cms/form";

const BLOG_SECTIONS = [
  { id: "basicos", label: "Básicos" },
  { id: "portada", label: "Portada" },
  { id: "contenido", label: "Contenido" },
  { id: "autor", label: "Autor" },
  { id: "publicacion", label: "Publicación" },
];

async function savePost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect(`/cms/blog`);
  }

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const excerpt = String(formData.get("excerpt") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "");
  const coverImageUrl =
    String(formData.get("coverImageUrl") ?? "").trim() || null;
  const authorName = String(formData.get("authorName") ?? "").trim() || null;
  const authorRole = String(formData.get("authorRole") ?? "").trim() || null;
  const category = String(formData.get("category") ?? "").trim() || null;
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  const status = formData.get("status") === "PUBLISHED"
    ? BlogPostStatus.PUBLISHED
    : BlogPostStatus.DRAFT;
  const readMinutesRaw = parseInt(String(formData.get("readMinutes") ?? ""), 10);
  const readMinutes = Number.isFinite(readMinutesRaw) ? readMinutesRaw : null;

  if (!title || !slug) {
    await setError("Faltan campos obligatorios: título y slug.");
    redirect(`/cms/blog/${id}`);
  }

  const exists = await prisma.blogPost.findFirst({
    where: { slug, NOT: { id } },
  });
  if (exists) {
    await setError(`Ya existe un post con el slug "${slug}".`);
    redirect(`/cms/blog/${id}`);
  }

  const current = await prisma.blogPost.findUnique({ where: { id } });
  const justPublished =
    current?.status !== BlogPostStatus.PUBLISHED &&
    status === BlogPostStatus.PUBLISHED;

  await prisma.blogPost.update({
    where: { id },
    data: {
      title,
      slug,
      excerpt,
      content,
      coverImageUrl,
      authorName,
      authorRole,
      category,
      tags,
      status,
      readMinutes,
      draft: Prisma.JsonNull,
      ...(justPublished ? { publishedAt: new Date() } : {}),
    },
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/cms/blog");
  await setSuccess("Cambios guardados.");
  redirect(`/cms/blog/${id}`);
}

export default async function BlogDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <EditorToolbar
        backHref="/cms/blog"
        backLabel="Volver al blog"
        publicHref={post.status === BlogPostStatus.PUBLISHED ? `/blog/${post.slug}` : undefined}
      />

      <div className="mb-6">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Editar post
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 32, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          {post.title}
        </h1>
      </div>

      <div className="lg:grid lg:grid-cols-[180px_1fr] lg:gap-8">
        <SectionNav sections={BLOG_SECTIONS} />

        <LivePreview
          model="blog"
          recordId={post.id}
          previewPath={`/blog/${post.slug}`}
        >
        <form
          action={savePost}
          className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8"
        >
          <input type="hidden" name="id" value={post.id} />
          <FormShortcuts />

        <Section id="basicos" title="Básicos">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Título" required>
              <Input name="title" defaultValue={post.title} required />
            </Field>
            <Field label="Slug" help="solo minúsculas, números y guiones">
              <Input name="slug" defaultValue={post.slug} required />
            </Field>
            <Field label="Categoría">
              <Input
                name="category"
                defaultValue={post.category ?? ""}
                placeholder="Producción, IA, Industria…"
              />
            </Field>
            <Field label="Tags" help="separados por coma">
              <Input
                name="tags"
                defaultValue={post.tags.join(", ")}
                placeholder="ia, color, fotografía"
              />
            </Field>
          </div>
          <Field
            label="Excerpt"
            help="2-3 líneas que aparecen en la card y como subtítulo del post"
          >
            <Textarea name="excerpt" defaultValue={post.excerpt ?? ""} rows={2} />
          </Field>
        </Section>

        <Section id="portada" title="Imagen de portada">
          <ImageField
            name="coverImageUrl"
            defaultValue={post.coverImageUrl}
            aspect="video"
          />
        </Section>

        <Section
          id="contenido"
          title="Contenido"
          help="Markdown con barra de herramientas y preview en vivo. La barra inserta sintaxis correcta; el preview muestra cómo se verá publicado."
        >
          <MarkdownEditor name="content" defaultValue={post.content} rows={20} />
        </Section>

        <Section id="autor" title="Autor">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field label="Nombre">
              <Input name="authorName" defaultValue={post.authorName ?? ""} />
            </Field>
            <Field label="Rol / cargo">
              <Input
                name="authorRole"
                defaultValue={post.authorRole ?? ""}
                placeholder="Director Creativo"
              />
            </Field>
          </div>
        </Section>

        <Section id="publicacion" title="Publicación">
          <div className="flex flex-wrap items-end gap-5">
            <Field label="Estado">
              <Select name="status" defaultValue={post.status}>
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
              </Select>
            </Field>
            <Field label="Min. de lectura">
              <Input
                name="readMinutes"
                type="number"
                defaultValue={post.readMinutes ? String(post.readMinutes) : ""}
                placeholder="auto"
                className="w-24"
              />
            </Field>
            {post.publishedAt && (
              <div className="pb-3 text-[12px] text-white/50">
                Publicado:{" "}
                <span className="text-white/75">
                  {new Date(post.publishedAt).toLocaleDateString("es-CO")}
                </span>
              </div>
            )}
          </div>
        </Section>

          <FormActions cancelHref="/cms/blog" submitLabel="Guardar" />
        </form>
        </LivePreview>
      </div>
    </div>
  );
}


