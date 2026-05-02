import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { OrgType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireMaster } from "@/lib/app-guards";
import { ConfirmForm } from "@/components/ConfirmForm";

const ORG_TYPE_LABELS: Record<OrgType, string> = {
  CLIENT: "Cliente",
  PRODUCER: "Productora",
  INTERNAL: "Interno",
};

async function createOrg(formData: FormData) {
  "use server";
  await requireMaster();
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? OrgType.CLIENT) as OrgType;
  const website = String(formData.get("website") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  if (!name) redirect("/app/orgs?error=invalid");

  await prisma.organization.create({
    data: { name, type, website, notes },
  });
  revalidatePath("/app/orgs");
}

async function deleteOrg(formData: FormData) {
  "use server";
  await requireMaster();
  const id = String(formData.get("id") ?? "");
  const inUse = await prisma.project.findFirst({
    where: { OR: [{ clientOrgId: id }, { producerOrgId: id }] },
    select: { id: true },
  });
  if (inUse) redirect("/app/orgs?error=in_use");
  await prisma.organization.delete({ where: { id } });
  revalidatePath("/app/orgs");
}

export default async function OrgsPage(props: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireMaster();
  const sp = await props.searchParams;

  const orgs = await prisma.organization.findMany({
    orderBy: [{ type: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { members: true, clientProjects: true, producerProjects: true },
      },
    },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            Maestro
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            Organizaciones
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-white/55">
            Clientes y productoras que participan en los proyectos.
          </p>
        </div>
      </div>

      {sp.error === "in_use" && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          No se puede eliminar: la organización tiene proyectos asociados.
        </div>
      )}

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Organización</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Miembros</th>
              <th className="px-5 py-3 font-medium">Proyectos</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orgs.map((o) => (
              <tr
                key={o.id}
                className="border-b text-white/85"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{o.name}</div>
                  {o.website && (
                    <a
                      href={o.website}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] text-orange hover:underline"
                    >
                      {o.website}
                    </a>
                  )}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-white/70">
                    {ORG_TYPE_LABELS[o.type]}
                  </span>
                </td>
                <td className="px-5 py-3 text-white/70">{o._count.members}</td>
                <td className="px-5 py-3 text-white/70">
                  {o._count.clientProjects + o._count.producerProjects}
                </td>
                <td className="px-5 py-3">
                  <ConfirmForm action={deleteOrg} message={`¿Eliminar "${o.name}"?`}>
                    <input type="hidden" name="id" value={o.id} />
                    <button
                      type="submit"
                      className="text-[12px] text-white/45 hover:text-red-400"
                    >
                      Eliminar
                    </button>
                  </ConfirmForm>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Crear organización
        </h2>
        <form
          action={createOrg}
          className="lg grid grid-cols-1 gap-4 rounded-2xl p-6 md:grid-cols-2"
        >
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Nombre
            </span>
            <input
              required
              name="name"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Tipo
            </span>
            <select
              name="type"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
              defaultValue={OrgType.CLIENT}
            >
              <option value={OrgType.CLIENT}>Cliente</option>
              <option value={OrgType.PRODUCER}>Productora</option>
              <option value={OrgType.INTERNAL}>Interna</option>
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Sitio web
            </span>
            <input
              name="website"
              placeholder="https://"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <label className="md:col-span-2 flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Notas internas
            </span>
            <textarea
              name="notes"
              rows={2}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            />
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Crear
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
