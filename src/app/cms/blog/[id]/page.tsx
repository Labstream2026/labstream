import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

async function savePost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect(`/cms/blog?error=denied`);

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

  if (!title || !slug) redirect(`/cms/blog/${id}?error=invalid`);

  const exists = await prisma.blogPost.findFirst({
    where: { slug, NOT: { id } },
  });
  if (exists) redirect(`/cms/blog/${id}?error=exists`);

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
      ...(justPublished ? { publishedAt: new Date() } : {}),
    },
  });

  revalidatePath("/blog");
  revalidatePath(`/blog/${slug}`);
  revalidatePath("/cms/blog");
  redirect(`/cms/blog/${id}?ok=saved`);
}

export default async function BlogDetailPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const { id } = await props.params;
  const sp = await props.searchParams;

  const post = await prisma.blogPost.findUnique({ where: { id } });
  if (!post) notFound();

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/cms/blog"
          className="text-[12px] text-white/55 hover:text-white"
        >
          ← Volver al blog
        </Link>
        {post.status === BlogPostStatus.PUBLISHED && (
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="text-[12px] text-orange hover:underline"
          >
            Ver en sitio público ↗
          </Link>
        )}
      </div>

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

      <Banner ok={sp.ok} error={sp.error} />

      <form
        action={savePost}
        className="lg flex flex-col gap-6 rounded-2xl p-6 md:p-8"
      >
        <input type="hidden" name="id" value={post.id} />

        <Section title="Básicos">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Labeled label="Título" required>
              <Input name="title" defaultValue={post.title} required />
            </Labeled>
            <Labeled label="Slug" help="solo minúsculas, números y guiones">
              <Input name="slug" defaultValue={post.slug} required />
            </Labeled>
            <Labeled label="Categoría">
              <Input
                name="category"
                defaultValue={post.category ?? ""}
                placeholder="Producción, IA, Industria…"
              />
            </Labeled>
            <Labeled label="Tags" help="separados por coma">
              <Input
                name="tags"
                defaultValue={post.tags.join(", ")}
                placeholder="ia, color, fotografía"
              />
            </Labeled>
          </div>
          <Labeled
            label="Excerpt"
            help="2-3 líneas que aparecen en la card y como subtítulo del post"
          >
            <Textarea name="excerpt" defaultValue={post.excerpt ?? ""} rows={2} />
          </Labeled>
        </Section>

        <Section title="Imagen de portada">
          <Labeled
            label="URL de imagen"
            help="Sube en /cms/assets y pega la URL aquí"
          >
            <Input
              name="coverImageUrl"
              defaultValue={post.coverImageUrl ?? ""}
              placeholder="https://…"
            />
          </Labeled>
          {post.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.coverImageUrl}
              alt=""
              className="aspect-video max-w-md rounded-lg object-cover"
              referrerPolicy="no-referrer"
            />
          )}
        </Section>

        <Section
          title="Contenido"
          help="Markdown soportado: ## títulos, **negrita**, *itálica*, `código`, listas con - o números, [links](url), > citas. Líneas en blanco separan párrafos."
        >
          <Textarea
            name="content"
            defaultValue={post.content}
            rows={20}
            mono
            placeholder="## Empezamos con el tratamiento

Lorem ipsum…"
          />
        </Section>

        <Section title="Autor">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Labeled label="Nombre">
              <Input name="authorName" defaultValue={post.authorName ?? ""} />
            </Labeled>
            <Labeled label="Rol / cargo">
              <Input
                name="authorRole"
                defaultValue={post.authorRole ?? ""}
                placeholder="Director Creativo"
              />
            </Labeled>
          </div>
        </Section>

        <Section title="Publicación">
          <div className="flex flex-wrap items-end gap-5">
            <Labeled label="Estado">
              <select
                name="status"
                defaultValue={post.status}
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              >
                <option value="DRAFT">Borrador</option>
                <option value="PUBLISHED">Publicado</option>
              </select>
            </Labeled>
            <Labeled label="Min. de lectura">
              <Input
                name="readMinutes"
                type="number"
                defaultValue={post.readMinutes ? String(post.readMinutes) : ""}
                placeholder="auto"
                className="w-24"
              />
            </Labeled>
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

        <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
          <Link
            href="/cms/blog"
            className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/5"
          >
            Cancelar
          </Link>
          <button type="submit" className="btn-primary">
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  help,
  children,
}: {
  title: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-white/5 pt-5 first:border-0 first:pt-0">
      <div>
        <div className="text-[14px] font-semibold text-white">{title}</div>
        {help && <div className="mt-0.5 text-[12px] text-white/45">{help}</div>}
      </div>
      {children}
    </div>
  );
}

function Labeled({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
        {required && <span className="text-orange">*</span>}
      </span>
      {children}
      {help && <span className="text-[11px] text-white/40">{help}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

function Textarea({
  mono,
  ...rest
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { mono?: boolean }) {
  return (
    <textarea
      {...rest}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] leading-relaxed text-white focus:border-orange/50 focus:outline-none ${mono ? "font-mono text-[12px]" : ""} ${rest.className ?? ""}`}
    />
  );
}

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? ok === "saved"
      ? "Cambios guardados"
      : ok === "created"
        ? "Post creado — completa el contenido abajo"
        : "Listo"
    : error === "denied"
      ? "No tienes permiso"
      : error === "invalid"
        ? "Faltan campos obligatorios (título y slug)"
        : error === "exists"
          ? "Ya existe un post con ese slug"
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
