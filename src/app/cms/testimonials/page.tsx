import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";

async function saveTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/testimonials?error=denied");

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

  if (!authorName || !body) redirect("/cms/testimonials?error=invalid");

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
  redirect("/cms/testimonials?ok=saved");
}

async function createTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/testimonials?error=denied");

  const authorName = String(formData.get("authorName") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!authorName || !body) redirect("/cms/testimonials?error=invalid");

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
  redirect("/cms/testimonials?ok=created");
}

async function deleteTestimonial(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) redirect("/cms/testimonials?error=denied");

  const id = String(formData.get("id") ?? "");
  await prisma.testimonial.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/cms/testimonials");
  redirect("/cms/testimonials?ok=deleted");
}

export default async function TestimonialsPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireCmsUser();
  const sp = await props.searchParams;

  const items = await prisma.testimonial.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }],
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
          Testimonios
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Lo que dicen los clientes. Aparecen en el carrusel de la home.
        </p>
      </div>

      <Banner ok={sp.ok} error={sp.error} />

      <div className="flex flex-col gap-4">
        {items.length === 0 && (
          <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
            No hay testimonios todavía. Agrega el primero abajo.
          </div>
        )}
        {items.map((t) => (
          <form
            key={t.id}
            action={saveTestimonial}
            className="lg flex flex-col gap-3 rounded-2xl p-5"
          >
            <input type="hidden" name="id" value={t.id} />

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

            <div className="flex flex-wrap items-end gap-3">
              <Field
                name="authorAvatarUrl"
                label="Avatar URL"
                defaultValue={t.authorAvatarUrl ?? ""}
                placeholder="https://… (opcional)"
                wide
              />
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
              <div className="ml-auto flex gap-2">
                <button
                  type="submit"
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
                >
                  Guardar
                </button>
              </div>
            </div>
          </form>
        ))}
        {items.map((t) => (
          <form
            key={`del-${t.id}`}
            action={deleteTestimonial}
            className="-mt-2 self-end"
          >
            <input type="hidden" name="id" value={t.id} />
            <button
              type="submit"
              className="text-[11px] text-white/30 hover:text-red-300"
            >
              Eliminar testimonio de {t.authorName} ↗
            </button>
          </form>
        ))}
      </div>

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nuevo testimonio
        </h2>
        <form
          action={createTestimonial}
          className="lg grid grid-cols-1 gap-3 rounded-2xl p-6 md:grid-cols-3"
        >
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

function Banner({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  const isOk = !!ok;
  const text = isOk
    ? ok === "saved"
      ? "Cambios guardados"
      : ok === "created"
        ? "Testimonio creado"
        : ok === "deleted"
          ? "Testimonio eliminado"
          : "Listo"
    : error === "denied"
      ? "No tienes permiso para esta acción"
      : error === "invalid"
        ? "Faltan campos obligatorios"
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
