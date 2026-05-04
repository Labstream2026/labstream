import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

async function saveService(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/services?error=denied");

  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const summary = String(formData.get("summary") ?? "").trim() || null;
  const content = String(formData.get("content") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;

  await prisma.service.update({
    where: { id },
    data: { title, summary, content, visible, order },
  });

  revalidatePath("/");
  revalidatePath("/cms/services");
}

async function createService(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/services?error=denied");

  const title = String(formData.get("title") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const summary = String(formData.get("summary") ?? "").trim() || null;

  if (!title || !slug) redirect("/cms/services?error=invalid");

  const exists = await prisma.service.findUnique({ where: { slug } });
  if (exists) redirect("/cms/services?error=exists");

  const top = await prisma.service.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.service.create({
    data: {
      slug,
      title,
      summary,
      order: (top?.order ?? -1) + 1,
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/services");
}

export default async function ServicesPage() {
  await requireCmsUser();
  const services = await prisma.service.findMany({
    orderBy: { order: "asc" },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Catálogo
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Servicios
        </h1>
      </div>

      <div className="flex flex-col gap-4">
        {services.map((s) => (
          <form
            key={s.id}
            action={saveService}
            className="lg grid grid-cols-1 gap-4 rounded-2xl p-5 md:grid-cols-[1fr_2fr_auto]"
          >
            <input type="hidden" name="id" value={s.id} />
            <input
              name="title"
              defaultValue={s.title}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[14px] font-medium text-white focus:border-orange/50 focus:outline-none"
            />
            <input
              name="summary"
              defaultValue={s.summary ?? ""}
              placeholder="Resumen corto"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white/85 focus:border-orange/50 focus:outline-none"
            />
            <div className="flex items-center gap-3">
              <input
                name="order"
                type="number"
                defaultValue={s.order}
                className="w-16 rounded-lg border border-white/10 bg-white/[0.04] px-2 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
              <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={s.visible}
                />
                Visible
              </label>
              <button
                type="submit"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Guardar
              </button>
              <Link
                href={`/cms/services/${s.id}`}
                className="rounded-md border border-orange/30 bg-orange/10 px-3 py-2 text-[12px] font-medium text-orange hover:bg-orange/15"
              >
                Detalle →
              </Link>
            </div>
            <input
              name="content"
              defaultValue={s.content ?? ""}
              placeholder="Tags separados por coma — Ej: Edit,Color,Motion"
              className="md:col-span-3 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/70 focus:border-orange/50 focus:outline-none"
            />
          </form>
        ))}
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nuevo servicio
        </h2>
        <form
          action={createService}
          className="lg flex flex-wrap items-end gap-4 rounded-2xl p-6"
        >
          <label className="flex flex-col gap-1.5">
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
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-1 min-w-[260px] flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Resumen
            </span>
            <input
              name="summary"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <button type="submit" className="btn-primary">
            Crear
          </button>
        </form>
      </div>
    </div>
  );
}
