import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireMaster, PROJECT_ROLE_LABELS } from "@/lib/app-guards";

export default async function TeamPage() {
  await requireMaster();

  const users = await prisma.user.findMany({
    where: { active: true },
    orderBy: { name: "asc" },
    include: {
      orgMemberships: { include: { org: { select: { name: true, type: true } } } },
      projectMemberships: {
        include: { project: { select: { id: true, name: true } } },
      },
    },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          Maestro
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Equipo
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          Vista global de todas las personas: a qué orgs pertenecen y en qué
          proyectos están participando.
        </p>
      </div>

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Persona</th>
              <th className="px-5 py-3 font-medium">Organizaciones</th>
              <th className="px-5 py-3 font-medium">Proyectos & roles</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b align-top text-white/85"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{u.name ?? "—"}</div>
                  <div className="text-[12px] text-white/45">{u.email}</div>
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {u.orgMemberships.length === 0 && (
                      <span className="text-[12px] text-white/40">—</span>
                    )}
                    {u.orgMemberships.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                      >
                        {m.org.name}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-5 py-3">
                  {u.projectMemberships.length === 0 ? (
                    <span className="text-[12px] text-white/40">
                      Sin proyectos
                    </span>
                  ) : (
                    <ul className="flex flex-col gap-1">
                      {u.projectMemberships.map((pm) => (
                        <li
                          key={pm.id}
                          className="flex items-center gap-2 text-[12px]"
                        >
                          <Link
                            href={`/app/projects/${pm.project.id}`}
                            className="text-white hover:text-orange"
                          >
                            {pm.project.name}
                          </Link>
                          <span className="text-orange">
                            · {PROJECT_ROLE_LABELS[pm.projectRole]}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-[12px] text-white/45">
        Para crear nuevos usuarios usa el panel de{" "}
        <Link href="/cms/users" className="text-orange hover:underline">
          Usuarios del CMS
        </Link>
        .
      </p>
    </div>
  );
}
