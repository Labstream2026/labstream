import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { ImageField } from "@/components/cms/ImageField";
import { SortableList } from "@/components/cms/SortableList";

async function saveLogo(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/logos");
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();
  const websiteUrl =
    String(formData.get("websiteUrl") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const featured = formData.get("featured") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;

  if (!name || !logoUrl) {
    await setError("Faltan campos obligatorios: nombre y URL del logo.");
    redirect("/cms/logos");
  }

  await prisma.clientLogo.update({
    where: { id },
    data: { name, logoUrl, websiteUrl, visible, featured, order },
  });

  revalidatePath("/");
  revalidatePath("/cms/logos");
  await setSuccess("Cambios guardados.");
  redirect("/cms/logos");
}

async function createLogo(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/logos");
  }

  const name = String(formData.get("name") ?? "").trim();
  const logoUrl = String(formData.get("logoUrl") ?? "").trim();

  if (!name || !logoUrl) {
    await setError("Faltan campos obligatorios: nombre y URL del logo.");
    redirect("/cms/logos");
  }

  const top = await prisma.clientLogo.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.clientLogo.create({
    data: {
      name,
      logoUrl,
      websiteUrl:
        String(formData.get("websiteUrl") ?? "").trim() || null,
      order: (top?.order ?? -1) + 1,
    },
  });

  revalidatePath("/");
  revalidatePath("/cms/logos");
  await setSuccess("Logo creado.");
  redirect("/cms/logos");
}

async function reorderLogos(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) return;
  const ids = String(formData.get("orderedIds") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.clientLogo.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath("/");
  revalidatePath("/cms/logos");
}

async function deleteLogo(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/logos");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.clientLogo.delete({ where: { id } });

  revalidatePath("/");
  revalidatePath("/cms/logos");
  await setSuccess("Logo eliminado.");
  redirect("/cms/logos");
}

export default async function LogosPage() {
  await requireCmsUser();

  const items = await prisma.clientLogo.findMany({
    orderBy: { order: "asc" },
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
          Logos cliente
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Marcas que aparecen en la home. Sube los logos en{" "}
          <a href="/cms/assets" className="text-orange hover:underline">
            /cms/assets
          </a>{" "}
          y pega la URL pública aquí. Recomendado: SVG o PNG transparente.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
          Aún no hay logos. Agrega el primero abajo.
        </div>
      ) : (
        <SortableList
          reorderAction={reorderLogos}
          items={items.map((l) => ({
            id: l.id,
            content: (
              <form
                action={saveLogo}
                className="lg flex flex-col gap-3 rounded-2xl p-5 md:flex-row md:items-center"
              >
            <input type="hidden" name="id" value={l.id} />

            <ImageField
              name="logoUrl"
              defaultValue={l.logoUrl}
              required
              aspect="square"
            />

            <div className="grid flex-1 grid-cols-1 gap-2 md:grid-cols-2">
              <input
                name="name"
                defaultValue={l.name}
                required
                placeholder="Nombre marca"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] font-medium text-white focus:border-orange/50 focus:outline-none"
              />
              <input
                name="websiteUrl"
                defaultValue={l.websiteUrl ?? ""}
                placeholder="https://… (opcional)"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white/70 focus:border-orange/50 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <input type="hidden" name="order" value={l.order} />
              <label
                className="flex items-center gap-1.5 text-[12px] text-white/70"
                title="Mostrar en home"
              >
                <input
                  type="checkbox"
                  name="visible"
                  defaultChecked={l.visible}
                />
                Vis
              </label>
              <label
                className="flex items-center gap-1.5 text-[12px] text-white/70"
                title="Destacado"
              >
                <input
                  type="checkbox"
                  name="featured"
                  defaultChecked={l.featured}
                />
                Dest
              </label>
              <DeleteButton action={deleteLogo} id={l.id} label={`Eliminar logo ${l.name}`} />
              <button
                type="submit"
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
              >
                Guardar
              </button>
            </div>
          </form>
            ),
          }))}
        />
      )}

      <div className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Nuevo logo
        </h2>
        <form
          action={createLogo}
          className="lg flex flex-col gap-4 rounded-2xl p-6"
        >
          <ImageField
            name="logoUrl"
            label="Logo (SVG / PNG transparente)"
            required
            aspect="square"
          />
          <div className="flex flex-wrap gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Nombre marca
              </span>
              <input
                name="name"
                required
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
              />
            </label>
            <label className="flex flex-1 min-w-[260px] flex-col gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                Sitio web (opcional)
              </span>
              <input
                name="websiteUrl"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
              />
            </label>
            <button type="submit" className="btn-primary">
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteButton({
  action,
  id,
  label,
}: {
  action: (formData: FormData) => void;
  id: string;
  label: string;
}) {
  return (
    <form action={action} className="inline">
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-red-500/20 px-2.5 py-2 text-[11px] text-red-300 hover:bg-red-500/10"
        title={label}
      >
        Eliminar
      </button>
    </form>
  );
}

