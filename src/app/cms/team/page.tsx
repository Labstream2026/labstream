import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireCmsUser, canEditPages } from "@/lib/cms-guard";
import { setError, setSuccess } from "@/lib/cms-flash";
import { ImageField } from "@/components/cms/ImageField";
import { SortableList } from "@/components/cms/SortableList";
import { PageHeader } from "@/components/cms/form";

async function saveMember(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/team");
  }

  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim() || null;
  const photoUrl = String(formData.get("photoUrl") ?? "").trim() || null;
  const instagram = String(formData.get("instagram") ?? "").trim() || null;
  const vimeo = String(formData.get("vimeo") ?? "").trim() || null;
  const linkedin = String(formData.get("linkedin") ?? "").trim() || null;
  const visible = formData.get("visible") === "on";
  const featured = formData.get("featured") === "on";
  const orderRaw = parseInt(String(formData.get("order") ?? "0"), 10);
  const order = Number.isFinite(orderRaw) ? orderRaw : 0;

  if (!name || !role) {
    await setError("Faltan campos obligatorios: nombre y rol.");
    redirect("/cms/team");
  }

  await prisma.teamMember.update({
    where: { id },
    data: {
      name,
      role,
      bio,
      photoUrl,
      instagram,
      vimeo,
      linkedin,
      visible,
      featured,
      order,
    },
  });

  revalidatePath("/nosotros");
  revalidatePath("/cms/team");
  await setSuccess("Cambios guardados.");
  redirect("/cms/team");
}

async function createMember(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/team");
  }

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();

  if (!name || !role) {
    await setError("Faltan campos obligatorios: nombre y rol.");
    redirect("/cms/team");
  }

  const top = await prisma.teamMember.findFirst({
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await prisma.teamMember.create({
    data: {
      name,
      role,
      bio: String(formData.get("bio") ?? "").trim() || null,
      order: (top?.order ?? -1) + 1,
    },
  });

  revalidatePath("/nosotros");
  revalidatePath("/cms/team");
  await setSuccess("Miembro agregado.");
  redirect("/cms/team");
}

async function reorderMembers(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) return;
  const ids = String(formData.get("orderedIds") ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  await prisma.$transaction(
    ids.map((id, i) =>
      prisma.teamMember.update({ where: { id }, data: { order: i } }),
    ),
  );
  revalidatePath("/nosotros");
  revalidatePath("/cms/team");
}

async function deleteMember(formData: FormData) {
  "use server";
  const me = await requireCmsUser();
  if (!canEditPages(me.role)) {
    await setError("No tienes permiso.");
    redirect("/cms/team");
  }

  const id = String(formData.get("id") ?? "");
  await prisma.teamMember.delete({ where: { id } });

  revalidatePath("/nosotros");
  revalidatePath("/cms/team");
  await setSuccess("Miembro eliminado.");
  redirect("/cms/team");
}

export default async function TeamPage() {
  await requireCmsUser();

  const items = await prisma.teamMember.findMany({
    orderBy: [{ featured: "desc" }, { order: "asc" }],
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <PageHeader
        eyebrow="Web pública"
        title="Equipo"
        subtitle={
          <>
            Aparecen en el grid de /nosotros. Para fotos, súbelas en{" "}
            <a href="/cms/assets" className="text-orange hover:underline">
              /cms/assets
            </a>{" "}
            y pega la URL aquí.
          </>
        }
      />

      {items.length === 0 ? (
        <div className="lg rounded-2xl p-6 text-center text-[14px] text-white/55">
          Aún no hay miembros del equipo.
        </div>
      ) : (
        <SortableList
          reorderAction={reorderMembers}
          items={items.map((m) => ({
            id: m.id,
            content: (
              <form
                action={saveMember}
                className="lg flex flex-col gap-3 rounded-2xl p-5 md:flex-row"
              >
            <input type="hidden" name="id" value={m.id} />

            <div className="flex flex-1 flex-col gap-2.5">
              <ImageField
                name="photoUrl"
                label="Foto"
                defaultValue={m.photoUrl}
                aspect="square"
              />

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Field name="name" label="Nombre" defaultValue={m.name} required />
                <Field name="role" label="Rol" defaultValue={m.role} required />
              </div>

              <label className="flex flex-col gap-1.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
                  Bio
                </span>
                <textarea
                  name="bio"
                  defaultValue={m.bio ?? ""}
                  rows={2}
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[12px] text-white focus:border-orange/50 focus:outline-none"
                />
              </label>


              <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                <Field
                  name="instagram"
                  label="Instagram"
                  defaultValue={m.instagram ?? ""}
                  placeholder="https://instagram.com/usuario"
                />
                <Field
                  name="vimeo"
                  label="Vimeo"
                  defaultValue={m.vimeo ?? ""}
                  placeholder="https://vimeo.com/usuario"
                />
                <Field
                  name="linkedin"
                  label="LinkedIn"
                  defaultValue={m.linkedin ?? ""}
                  placeholder="https://linkedin.com/in/…"
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="hidden" name="order" value={m.order} />
                <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                  <input
                    type="checkbox"
                    name="visible"
                    defaultChecked={m.visible}
                  />
                  Visible
                </label>
                <label className="flex items-center gap-1.5 text-[12px] text-white/70">
                  <input
                    type="checkbox"
                    name="featured"
                    defaultChecked={m.featured}
                  />
                  Destacado
                </label>
                <DeleteButton
                  action={deleteMember}
                  id={m.id}
                  label={`Eliminar a ${m.name}`}
                />
                <button
                  type="submit"
                  className="ml-auto rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] font-medium text-white hover:bg-white/10"
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
          Nuevo miembro
        </h2>
        <form
          action={createMember}
          className="lg flex flex-col gap-3 rounded-2xl p-6"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <Field name="name" label="Nombre" required />
            <Field name="role" label="Rol" placeholder="Director, Productor…" required />
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Bio (opcional)
            </span>
            <textarea
              name="bio"
              rows={2}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <button type="submit" className="btn-primary self-start">
            Agregar
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
}: {
  name: string;
  label: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
      />
    </label>
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

