import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { ImageField } from "@/components/cms/ImageField";
import { SortableList } from "@/components/cms/SortableList";
import { PageHeader, FormShortcuts } from "@/components/cms/form";
import { ConfirmButton } from "@/components/cms/ConfirmButton";

async function saveTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/testimonials");
  }

  const id = String(formData.get("id") ?? "");
  const authorName = String(formData.get("authorName") ?? "").trim();
  const authorRole = String(formData.get("authorRole") ?? "").trim() || null;
  const authorCompany =
    String(formData.get("authorCompany") ?? "").trim() || null;
  const authorAvatarUrl =
    String(formData.get("authorAvatarUrl") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim();
  const ratingRaw = parseInt(String(formData.get("rating") ?? ""), 10);
  const rating = Number.isFinite(ratingRaw) ? Math.min(5, Math.max(1, ratingRaw)) : null;
  const visible = formData.get("visible") === "on";
  const featured = formData.get("featured") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;

  if (!authorName || !body) {
    await setError("Faltan campos obligatorios: nombre y testimonio.");
    redirect("/cms/testimonials");
  }

  await prisma.testimonial.update({
    where: { id },
    data: {
      authorName,
      authorRole,
      authorCompany,
      authorAvatarUrl,
      body,
      rating,
      visible,
      featured,
      order,
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/testimonials");
  await setSuccess("Cambios guardados.");
  redirect("/cms/testimonials");
}

async function createTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/testimonials");
  }

  const authorName = String(formData.get("authorName") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!authorName || !body) {
    await setError("Faltan campos obligatorios: nombre y testimonio.");
    redirect("/cms/testimonials");
  }

  const top = await prisma.testimonial.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.testimonial.create({
    data: {
      authorName,
      body,
      authorRole:
        String(formData.get("authorRole") ?? "").trim() || null,
      authorCompany:
        String(formData.get("authorCompany") ?? "").trim() || null,
      order: (top?.order ?? -1) + 1,
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/testimonials");
  await setSuccess("Testimonio creado.");
  redirect("/cms/testimonials");
}

async function reorderTestimonials(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) return;

  const ids = String(formData.get("orderedIds") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.testimonial.update({ where: { id }, data: { order: i } }),
    ),
  );

  revalidatePath("/");
  revalidatePath("/cms/testimonials");
}

async function deleteTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/testimonials");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.testimonial.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/cms/testimonials");
  await setSuccess("Testimonio eliminado.");
  redirect("/cms/testimonials");
}

export default async function TestimonialsPage() {
  await requireCmsUser();

  const items = await prisma.testimonial.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }],
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Testimonios"
        subtitle="Lo que dicen los clientes. Aparecen en el carrusel de la home."
      />

      {items.length === 0 ? (
        <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
          No hay testimonios todavía. Agrega el primero abajo.
        </div>
      ) : (
        <SortableList
          reorderAction={reorderTestimonials}
          items={items.map((t) => ({
            id: t.id,
            content: (
              <form
                action={saveTestimonial}
                className="lg flex flex-col gap-3 rounded-2xl p-5"
              >
            <input type="hidden" name="id" value={t.id} />
            <FormShortcuts />

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <Field
                name="authorName"
                label="Nombre"
                defaultValue={t.authorName}
                required
              />
              <Field
                name="authorRole"
                label="Cargo"
                defaultValue={t.authorRole ?? ""}
                placeholder="Brand Manager"
              />
              <Field
                name="authorCompany"
                label="Empresa"
                defaultValue={t.authorCompany ?? ""}
                placeholder="PepsiCo"
              />
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Testimonio
              </span>
              <textarea
                name="body"
                defaultValue={t.body}
                rows={3}
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
            </label>

            <ImageField
              name="authorAvatarUrl"
              label="Avatar"
              defaultValue={t.authorAvatarUrl}
              aspect="square"
            />

            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Rating
                </span>
                <input
                  name="rating"
                  type="number"
                  min={1}
                  max={5}
                  defaultValue={t.rating ?? ""}
                  placeholder="1-5"
                  className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Orden
                </span>
                <input
                  name="order"
                  type="number"
                  defaultValue={t.order}
                  className="w-20 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
                />
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={t.visible}
                />
                Visible
              </label>
              <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={t.featured}
                />
                Destacado
              </label>
              <div className="ml-auto flex items-center gap-2">
                <ConfirmButton
                  action={deleteTestimonial}
                  hiddenFields={{ id: t.id }}
                  title="Eliminar testimonio"
                  description={<>¿Quieres eliminar el testimonio de <strong>{t.authorName}</strong>? Esta acción no se puede deshacer.</>}
                  confirmLabel="Eliminar"
                  ariaLabel={`Eliminar testimonio de ${t.authorName}`}
                  className="rounded-md border border-red-500/20 px-2.5 py-2 text-[11px] text-red-300 hover:bg-red-500/10"
                >
                  Eliminar
                </ConfirmButton>
                <button
                  type="submit"
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
            ),
          }))}
        />
      )}

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nuevo testimonio
        </h2>
        <form
          action={createTestimonial}
          className="lg grid grid-cols-1 gap-3 rounded-2xl p-6 md:grid-cols-3"
        >
          <FormShortcuts />
          <Field name="authorName" label="Nombre" required />
          <Field name="authorRole" label="Cargo" placeholder="Brand Manager" />
          <Field name="authorCompany" label="Empresa" placeholder="PepsiCo" />
          <label className="flex flex-col gap-1.5 md:col-span-3">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Testimonio
            </span>
            <textarea
              name="body"
              rows={3}
              required
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
            />
          </label>
          <button type="submit" className="btn-primary md:col-span-3 self-start">
            Crear testimonio
          </button>
        </form>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  placeholder,
  required,
  wide,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  wide?: boolean;
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${wide ? "flex-1 min-w-[220px]" : ""}`}>
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none"
      />
    </label>
  );
}

