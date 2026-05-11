import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory } from "@prisma/client";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { PageHeader, FormShortcuts } from "@/components/cms/form";

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
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso para crear proyectos.");
    redirect("/cms/portfolio");
  }

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

  if (!title || !slug) {
    await setError("Faltan campos obligatorios: título y slug.");
    redirect("/cms/portfolio");
  }

  const exists = await prisma.portfolioProject.findUnique({ where: { slug } });
  if (exists) {
    await setError(`Ya existe un proyecto con el slug "${slug}".`);
    redirect("/cms/portfolio");
  }

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
  await setSuccess("Proyecto creado — completa los detalles abajo.");
  redirect(`/cms/portfolio/${created.id}`);
}

async function deleteProject(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/portfolio");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.portfolioProject.delete({ where: { id } });

  revalidatePath("/portafolio");
  revalidatePath("/cms/portfolio");
  await setSuccess("Proyecto eliminado.");
  redirect("/cms/portfolio");
}

export default async function PortfolioListPage(props: {
  searchParams: Promise<{ q?: string; cat?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;
  const q = sp.q?.trim() ?? "";
  const cat = sp.cat as PortfolioCategory | undefined;

  const projects = await prisma.portfolioProject.findMany({
    where: {
      ...(cat ? { category: cat } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { client: { contains: q, mode: "insensitive" as const } },
              { slug: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ featured: "desc" }, { order: "asc" }, { year: "desc" }],
  });

  const totalCount = await prisma.portfolioProject.count();

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Portafolio"
        subtitle="Casos de estudio. El primero destacado aparece grande en el grid de /portafolio."
      />

      {/* Búsqueda + filtros */}
      <form
        method="GET"
        action="/cms/portfolio"
        className="mb-5 flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por título, cliente o slug…"
          className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
        />
        {cat && <input type="hidden" name="cat" value={cat} />}
        <button
          type="submit"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white hover:bg-white/10"
        >
          Buscar
        </button>
        {(q || cat) && (
          <a
            href="/cms/portfolio"
            className="rounded-md px-3 py-2 text-[12px] text-white/55 hover:text-white"
          >
            Limpiar
          </a>
        )}
      </form>

      <div className="mb-5 flex flex-wrap gap-1.5">
        <FilterChip href="/cms/portfolio" active={!cat} label={`Todos (${totalCount})`} />
        {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
          <FilterChip
            key={k}
            href={`/cms/portfolio?cat=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={cat === k}
            label={v}
          />
        ))}
      </div>

      {projects.length === 0 && (q || cat) && (
        <div className="mb-5 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-[13px] text-white/55">
          No hay resultados para tu búsqueda.{" "}
          <a href="/cms/portfolio" className="text-orange hover:underline">
            Limpiar filtros
          </a>
        </div>
      )}

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
          <FormShortcuts />
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

