import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { blogCreateSchema, parseForm, summarizeErrors } from "@/lib/cms-schemas";
import { PageHeader, FormShortcuts } from "@/components/cms/form";
import { ConfirmButton } from "@/components/cms/ConfirmButton";

async function createPost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/blog");
  }

  const parsed = parseForm(blogCreateSchema, formData);
  if (!parsed.ok) {
    await setError(summarizeErrors(parsed.errors), parsed.errors);
    redirect("/cms/blog");
  }
  const data = parsed.data;

  const exists = await prisma.blogPost.findUnique({ where: { slug: data.slug } });
  if (exists) {
    await setError(`Ya existe un post con el slug "${data.slug}".`);
    redirect("/cms/blog");
  }

  const created = await prisma.blogPost.create({
    data: {
      slug: data.slug,
      title: data.title,
      content: "",
      category: data.category,
      status: BlogPostStatus.DRAFT,
    },
  });

  revalidatePath("/blog");
  await setSuccess("Post creado — completa el contenido abajo.");
  redirect(`/cms/blog/${created.id}`);
}

async function deletePost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/blog");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.blogPost.delete({ where: { id } });

  revalidatePath("/blog");
  revalidatePath("/cms/blog");
  await setSuccess("Post eliminado.");
  redirect("/cms/blog");
}

export default async function BlogListPage(props: {
  searchParams: Promise<{ q?: string; cat?: string; status?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;
  const q = sp.q?.trim() ?? "";
  const cat = sp.cat?.trim();
  const statusFilter = sp.status === "published"
    ? BlogPostStatus.PUBLISHED
    : sp.status === "draft"
      ? BlogPostStatus.DRAFT
      : null;

  const posts = await prisma.blogPost.findMany({
    where: {
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(cat ? { category: cat } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { excerpt: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  const allCats = await prisma.blogPost.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const categories = allCats
    .map((c) => c.category)
    .filter((c): c is string => Boolean(c));

  const totalCount = await prisma.blogPost.count();
  const queryString = (extra: Record<string, string | undefined>) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (cat) params.set("cat", cat);
    if (sp.status) params.set("status", sp.status);
    for (const [k, v] of Object.entries(extra)) {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Blog"
        subtitle={
          <>
            Notas, casos de estudio, reflexiones. Solo se publican los marcados
            como &ldquo;Publicado&rdquo;.
          </>
        }
      />

      {/* Búsqueda */}
      <form
        method="GET"
        action="/cms/blog"
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, excerpt o slug…"
          className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
        />
        {cat && <input type="hidden" name="cat" value={cat} />}
        {sp.status && <input type="hidden" name="status" value={sp.status} />}
        <button
          type="submit"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white hover:bg-white/10"
        >
          Buscar
        </button>
        {(q || cat || sp.status) && (
          <Link
            href="/cms/blog"
            className="rounded-md px-3 py-2 text-[12px] text-white/55 hover:text-white"
          >
            Limpiar
          </Link>
        )}
      </form>

      {/* Filtros estado */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        <FilterChip
          href={`/cms/blog${queryString({ status: undefined })}`}
          active={!sp.status}
          label={`Todos (${totalCount})`}
        />
        <FilterChip
          href={`/cms/blog${queryString({ status: "published" })}`}
          active={sp.status === "published"}
          label="Publicados"
        />
        <FilterChip
          href={`/cms/blog${queryString({ status: "draft" })}`}
          active={sp.status === "draft"}
          label="Borradores"
        />
      </div>

      {/* Filtros categoría */}
      {categories.length > 0 && (
        <div className="mb-5 flex flex-wrap gap-1.5">
          <FilterChip
            href={`/cms/blog${queryString({ cat: undefined })}`}
            active={!cat}
            label="Todas las categorías"
          />
          {categories.map((c) => (
            <FilterChip
              key={c}
              href={`/cms/blog${queryString({ cat: c })}`}
              active={cat === c}
              label={c}
            />
          ))}
        </div>
      )}

      {posts.length === 0 && (q || cat || sp.status) && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/55">
          No hay resultados.{" "}
          <Link href="/cms/blog" className="text-orange hover:underline">
            Limpiar filtros
          </Link>
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-3">
        {posts.length === 0 && (
          <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
            Aún no hay posts. Crea el primero abajo.
          </div>
        )}
        {posts.map((p) => (
          <div
            key={p.id}
            className="lg flex items-center gap-4 rounded-2xl p-4"
          >
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
                <span className="text-[10px] uppercase text-white/30">
                  Sin imagen
                </span>
              )}
            </div>

            <div className="flex flex-1 flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                    p.status === BlogPostStatus.PUBLISHED
                      ? "bg-green-500/15 text-green-300"
                      : "bg-white/10 text-white/50"
                  }`}
                >
                  {p.status === BlogPostStatus.PUBLISHED
                    ? "Publicado"
                    : "Borrador"}
                </span>
                {p.category && (
                  <span className="text-[10px] uppercase tracking-wider text-orange/80">
                    {p.category}
                  </span>
                )}
              </div>
              <div className="text-[15px] font-semibold text-white">
                {p.title}
              </div>
              <div className="text-[12px] text-white/55">
                {p.authorName ?? "—"} · /{p.slug}
                {p.publishedAt
                  ? ` · ${new Date(p.publishedAt).toLocaleDateString("es-CO")}`
                  : ""}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {p.status === BlogPostStatus.PUBLISHED && (
                <Link
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  className="text-[11px] text-white/40 hover:text-white"
                >
                  Ver ↗
                </Link>
              )}
              <Link
                href={`/cms/blog/${p.id}`}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Editar
              </Link>
              <ConfirmButton
                action={deletePost}
                hiddenFields={{ id: p.id }}
                title="Eliminar post"
                description={<>¿Quieres eliminar <strong>{p.title}</strong>? Esta acción no se puede deshacer.</>}
                confirmLabel="Eliminar"
                ariaLabel="Eliminar"
              >
                ✕
              </ConfirmButton>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">Nuevo post</h2>
        <form
          action={createPost}
          className="lg flex flex-wrap items-end gap-4 rounded-2xl p-6"
        >
          <FormShortcuts />
          <label className="flex flex-1 min-w-[260px] flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Título
            </span>
            <input
              name="title"
              required
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Slug
            </span>
            <input
              name="slug"
              required
              placeholder="mi-primer-post"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Categoría (opcional)
            </span>
            <input
              name="category"
              placeholder="Producción, IA, Industria…"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
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

