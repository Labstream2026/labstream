import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { BlogPostStatus } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

async function createPost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/blog?error=denied");

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const category = String(formData.get("category") ?? "").trim() || null;

  if (!title || !slug) redirect("/cms/blog?error=invalid");

  const exists = await prisma.blogPost.findUnique({ where: { slug } });
  if (exists) redirect("/cms/blog?error=exists");

  const created = await prisma.blogPost.create({
    data: {
      slug,
      title,
      content: "",
      category,
      status: BlogPostStatus.DRAFT,
    },
  });

  revalidatePath("/blog");
  redirect(`/cms/blog/${created.id}?ok=created`);
}

async function deletePost(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/blog?error=denied");

  const id = String(formData.get("id") ?? "");
  await prisma.blogPost.delete({ where: { id } });

  revalidatePath("/blog");
  revalidatePath("/cms/blog");
  redirect("/cms/blog?ok=deleted");
}

export default async function BlogListPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;

  const posts = await prisma.blogPost.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Web pública
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Blog
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Notas, casos de estudio, reflexiones. Solo se publican los marcados
          como &ldquo;Publicado&rdquo;.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

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
              <form action={deletePost}>
                <input type="hidden" name="id" value={p.id} />
                <button
                  type="submit"
                  className="rounded-md border border-red-500/20 px-2.5 py-2 text-[12px] text-red-300 hover:bg-red-500/10"
                  title="Eliminar"
                >
                  ✕
                </button>
              </form>
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

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? ok === "deleted"
      ? "Post eliminado"
      : "Listo"
    : error === "denied"
      ? "No tienes permiso"
      : error === "invalid"
        ? "Faltan campos obligatorios"
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
