import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/cms-guard";
import { CmsRole } from "@prisma/client";

async function toggleAssignment(formData: FormData) {
  "use server";
  await requireSuperAdmin();

  const pageId = String(formData.get("pageId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const desired = String(formData.get("assigned") ?? "0") === "1";

  if (!pageId || !userId) return;

  if (desired) {
    await prisma.pageAssignment.upsert({
      where: { pageId_userId: { pageId, userId } },
      update: { canEdit: true },
      create: { pageId, userId, canEdit: true },
    });
  } else {
    await prisma.pageAssignment
      .delete({ where: { pageId_userId: { pageId, userId } } })
      .catch(() => null);
  }

  revalidatePath(`/cms/pages/${pageId}/assignments`);
  revalidatePath(`/cms/pages/${pageId}`);
}

export default async function AssignmentsPage(props: {
  params: Promise<{ id: string }>;
}) {
  await requireSuperAdmin();
  const { id } = await props.params;

  const page = await prisma.page.findUnique({
    where: { id },
    include: {
      assignments: { include: { user: true } },
    },
  });
  if (!page) notFound();

  const editors = await prisma.user.findMany({
    where: {
      role: { in: [CmsRole.EDITOR, CmsRole.REVIEWER] },
      active: true,
    },
    orderBy: { name: "asc" },
  });

  const assignedIds = new Set(page.assignments.map((a) => a.userId));

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-6 flex items-center gap-3 text-[13px] text-white/45">
        <Link href="/cms/pages" className="hover:text-white">
          Páginas
        </Link>
        <span>/</span>
        <Link href={`/cms/pages/${page.id}`} className="hover:text-white">
          {page.title}
        </Link>
        <span>/</span>
        <span className="text-white/85">Editores asignados</span>
      </div>

      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Acceso por página
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          ¿Quién puede editar esta página?
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Los <span className="font-semibold text-white/85">Editores</span>{" "}
          solo verán y podrán modificar las páginas que les asignes aquí. Los{" "}
          <span className="font-semibold text-white/85">Super Admin</span>{" "}
          siempre tienen acceso a todo.
        </p>
      </div>

      {editors.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          Aún no hay editores en el equipo. Crea uno en{" "}
          <Link href="/cms/users" className="text-orange hover:underline">
            Usuarios del equipo
          </Link>
          .
        </div>
      ) : (
        <div className="lg overflow-x-auto rounded-2xl">
          <table className="w-full text-left text-[14px]">
            <thead>
              <tr
                className="border-b text-[11px] uppercase tracking-wider text-white/45"
                style={{ borderColor: "var(--border)" }}
              >
                <th className="px-5 py-3 font-medium">Usuario</th>
                <th className="px-5 py-3 font-medium">Rol</th>
                <th className="px-5 py-3 font-medium">Acceso a esta página</th>
              </tr>
            </thead>
            <tbody>
              {editors.map((u) => {
                const isAssigned = assignedIds.has(u.id);
                return (
                  <tr
                    key={u.id}
                    className="border-b text-white/85"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <td className="px-5 py-3">
                      <div className="font-medium text-white">
                        {u.name ?? "—"}
                      </div>
                      <div className="text-[12px] text-white/45">{u.email}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-[12px] capitalize text-white/70">
                        {u.role.toLowerCase().replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <form
                        action={toggleAssignment}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="pageId" value={page.id} />
                        <input type="hidden" name="userId" value={u.id} />
                        <input
                          type="hidden"
                          name="assigned"
                          value={isAssigned ? "0" : "1"}
                        />
                        <span
                          className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                          style={{
                            background: isAssigned
                              ? "rgba(34,197,94,0.13)"
                              : "rgba(255,255,255,0.05)",
                            color: isAssigned ? "#7DEEA0" : "rgba(255,255,255,0.5)",
                          }}
                        >
                          {isAssigned ? "Con acceso" : "Sin acceso"}
                        </span>
                        <button
                          type="submit"
                          className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
                        >
                          {isAssigned ? "Revocar" : "Asignar"}
                        </button>
                      </form>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
