import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

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

async function createProject(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/portfolio?error=denied");

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const yearRaw = parseInt(String(formData.get("year") ?? ""), 10);
  const year = Number.isFinite(yearRaw) ? yearRaw : new Date().getFullYear();
  const category = String(formData.get("category") ?? "COMERCIAL") as PortfolioCategory;
  const client = String(formData.get("client") ?? "").trim() || null;

  if (!title || !slug) redirect("/cms/portfolio?error=invalid");

  const exists = await prisma.portfolioProject.findUnique({ where: { slug } });
  if (exists) redirect("/cms/portfolio?error=exists");

  const top = await prisma.portfolioProject.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  const created = await prisma.portfolioProject.create({
    data: {
      slug,
      title,
      year,
      category,
      client,
      order: (top?.order ?? -1) + 1,
      publishedAt: new Date(),
    },
  });

  revalidatePath("/portafolio");
  redirect(`/cms/portfolio/${created.id}?ok=created`);
}

async function deleteProject(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/portfolio?error=denied");

  const id = String(formData.get("id") ?? "");
  await prisma.portfolioProject.delete({ where: { id } });

  revalidatePath("/portafolio");
  revalidatePath("/cms/portfolio");
  redirect("/cms/portfolio?ok=deleted");
}

export default async function PortfolioListPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;

  const projects = await prisma.portfolioProject.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }, { year: "desc" }],
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
          Portafolio
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Casos de estudio. El primero destacado aparece grande en el grid de
          /portafolio.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <div className="mb-8 grid grid-cols-1 gap-3">
        {projects.length === 0 && (
          <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
            Aún no hay proyectos. Crea el primero abajo.
          </div>
        )}
        {projects.map((p) => (
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
                {p.featured && (
                  <span className="rounded-full bg-orange/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange">
                    Destacado
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-wider text-white/40">
                  {CATEGORY_LABELS[p.category]} · {p.year}
                </span>
              </div>
              <div className="text-[15px] font-semibold text-white">
                {p.title}
              </div>
              <div className="text-[12px] text-white/55">
                {p.client ?? "—"} · /{p.slug}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/portafolio/${p.slug}`}
                target="_blank"
                className="text-[11px] text-white/40 hover:text-white"
              >
                Ver ↗
              </Link>
              <Link
                href={`/cms/portfolio/${p.id}`}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Editar
              </Link>
              <form action={deleteProject}>
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
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nuevo proyecto
        </h2>
        <form
          action={createProject}
          className="lg flex flex-wrap items-end gap-4 rounded-2xl p-6"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Título
            </span>
            <input
              name="title"
              required
              placeholder="PepsiCo · Campaña verano 2025"
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
              placeholder="pepsi-summer-2025"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Cliente
            </span>
            <input
              name="client"
              placeholder="PepsiCo"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Año
            </span>
            <input
              name="year"
              type="number"
              defaultValue={new Date().getFullYear()}
              className="w-24 rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Categoría
            </span>
            <select
              name="category"
              defaultValue="COMERCIAL"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
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
      ? "Proyecto eliminado"
      : "Listo"
    : error === "denied"
      ? "No tienes permiso"
      : error === "invalid"
        ? "Faltan campos obligatorios"
        : error === "exists"
          ? "Ya existe un proyecto con ese slug"
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
