import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  requireCmsUser,
  isSuperAdmin,
  listAccessiblePageIds,
} from "@/lib/cms-guard";
import { PageStatus } from "@prisma/client";

async function createPage(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  // requireCmsUser ya bloquea a quien no tiene acceso al CMS.
  // Editor/Reviewer del CMS también pueden crear páginas.

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!title || !slug) {
    redirect("/cms/pages?error=invalid");
  }

  const exists = await prisma.page.findUnique({ where: { slug } });
  if (exists) redirect("/cms/pages?error=exists");

  const page = await prisma.page.create({
    data: {
      slug,
      title,
      status: PageStatus.DRAFT,
      updatedById: me.id,
    },
  });

  revalidatePath("/cms/pages");
  redirect(`/cms/pages/${page.id}`);
}

export default async function PagesIndex(props: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const me = await requireCmsUser();
  const sp = await props.searchParams;
  const isSuper = isSuperAdmin(me.role);

  const access = await listAccessiblePageIds(me.id, me.role);

  const pages = await prisma.page.findMany({
    where: access.all ? undefined : { id: { in: access.ids } },
    orderBy: [{ isHome: "desc" }, { order: "asc" }, { updatedAt: "desc" }],
    include: {
      updatedBy: { select: { name: true, email: true } },
      _count: { select: { blocks: true, assignments: true } },
    },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            Contenido
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            Páginas
          </h1>
        </div>
      </div>

      {sp.error === "denied" && (
        <Banner kind="error" text="No tienes permiso para esa acción." />
      )}
      {sp.error === "exists" && (
        <Banner kind="error" text="Ya existe una página con ese slug." />
      )}
      {sp.error === "invalid" && (
        <Banner kind="error" text="Datos inválidos." />
      )}
      {sp.ok === "deleted" && (
        <Banner kind="ok" text="Página eliminada." />
      )}
      {access.all === false && pages.length === 0 && (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          Aún no tienes páginas asignadas. Pídele al Super Admin que te asigne una desde el editor de cada página.
        </div>
      )}

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Página</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Bloques</th>
              <th className="px-5 py-3 font-medium">Actualizado</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((p) => (
              <tr
                key={p.id}
                className="border-b text-white/85"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2 font-medium text-white">
                    {p.title}
                    {p.isHome && (
                      <span className="rounded-full border border-orange/40 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-orange">
                        home
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-white/45">/{p.slug}</div>
                </td>
                <td className="px-5 py-3">
                  <StatusPill status={p.status} />
                </td>
                <td className="px-5 py-3 text-white/65">
                  {p._count.blocks}
                </td>
                <td className="px-5 py-3 text-white/55">
                  {p.updatedAt.toLocaleString("es-CO", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-5 py-3">
                  <Link
                    href={`/cms/pages/${p.id}`}
                    className="rounded-md border border-white/10 px-3 py-1 text-[12px] text-white/80 hover:bg-white/5 hover:text-white"
                  >
                    Editar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isSuper && (
        <div className="mt-10">
          <h2 className="mb-4 text-[16px] font-semibold text-white">
            Crear nueva página
          </h2>
          <form
            action={createPage}
            className="lg flex flex-wrap items-end gap-4 rounded-2xl p-6"
          >
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Título
              </span>
              <input
                name="title"
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
                style={{ minWidth: 240 }}
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Slug (URL)
              </span>
              <input
                name="slug"
                required
                placeholder="ej: nosotros"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
                style={{ minWidth: 240 }}
              />
            </label>
            <button type="submit" className="btn-primary">
              Crear borrador
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    PUBLISHED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0", label: "Publicado" },
    DRAFT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272", label: "Borrador" },
    REVIEW: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF", label: "En revisión" },
  };
  const s = map[status] ?? map.DRAFT;
  return (
    <span
      className="inline-block rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {s.label}
    </span>
  );
}

function Banner({ kind, text }: { kind: "error" | "ok"; text: string }) {
  const ok = kind === "ok";
  return (
    <div
      className="mb-4 rounded-lg border px-3.5 py-2.5 text-[13px]"
      style={{
        borderColor: ok ? "rgba(34,197,94,0.3)" : "rgba(239,68,68,0.3)",
        background: ok ? "rgba(34,197,94,0.1)" : "rgba(239,68,68,0.1)",
        color: ok ? "#A7F3C0" : "#FCA5A5",
      }}
    >
      {text}
    </div>
  );
}
