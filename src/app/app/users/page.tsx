import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import {
  CmsRole,
  UserKind,
  ProjectRole,
  OrgType,
  OrgRole,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireProducerOrMaster,
  USER_KIND_LABELS,
  USER_KIND_DESCRIPTIONS,
  PROJECT_ROLE_LABELS,
  creatableKinds,
  isMaster,
  canManageProject,
  producerCanManageUser,
  producerCanUseOrg,
} from "@/lib/app-guards";
import { Avatar } from "@/components/app/ui/Avatar";

const newUserSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
  kind: z.enum([
    UserKind.CMS_EDITOR,
    UserKind.CMS_REVIEWER,
    UserKind.PRODUCER,
    UserKind.TEAM,
    UserKind.CLIENT,
  ]),
  password: z.string().min(8).max(120),
  orgId: z.string().optional(),
  projectId: z.string().optional(),
  projectRole: z.nativeEnum(ProjectRole).optional(),
});

/** Roles que conceden poder de gestión o de aprobación-cliente: solo el master
 *  (ADMIN) puede otorgarlos al crear usuarios. */
const PRIVILEGED_PROJECT_ROLES: ProjectRole[] = [
  ProjectRole.EXEC_PRODUCER,
  ProjectRole.PRODUCER,
  ProjectRole.CLIENT_LEAD,
];

async function createUser(formData: FormData) {
  "use server";
  const me = await requireProducerOrMaster();

  const parsed = newUserSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? UserKind.TEAM),
    password: String(formData.get("password") ?? ""),
    orgId: String(formData.get("orgId") ?? "") || undefined,
    projectId: String(formData.get("projectId") ?? "") || undefined,
    projectRole: String(formData.get("projectRole") ?? "") || undefined,
  });

  if (!parsed.success) {
    redirect("/app/users?error=invalid");
  }

  // Validar que el creador puede crear ese tipo
  const allowed = creatableKinds(me.kind);
  if (!allowed.includes(parsed.data.kind)) {
    redirect("/app/users?error=denied_kind");
  }

  const meIsMaster = isMaster(me.kind);

  // Un productor solo puede asignar a orgs/proyectos dentro de su ámbito.
  if (!meIsMaster) {
    if (parsed.data.kind === UserKind.CLIENT && parsed.data.orgId) {
      const ok = await producerCanUseOrg(me.id, parsed.data.orgId);
      if (!ok) redirect("/app/users?error=denied_scope");
    }
    if (
      (parsed.data.kind === UserKind.PRODUCER ||
        parsed.data.kind === UserKind.TEAM) &&
      parsed.data.projectId
    ) {
      const ok = await canManageProject(me.id, me.role, parsed.data.projectId);
      if (!ok) redirect("/app/users?error=denied_scope");
    }
  }

  const exists = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (exists) {
    redirect("/app/users?error=exists");
  }

  // Mapear kind → CmsRole legacy (para compatibilidad)
  const cmsRole: CmsRole =
    parsed.data.kind === UserKind.CMS_REVIEWER
      ? CmsRole.REVIEWER
      : CmsRole.EDITOR;

  const newUser = await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      kind: parsed.data.kind,
      role: cmsRole,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      createdById: me.id,
    },
  });

  // Si es CLIENT: agregarlo a la org cliente seleccionada
  if (parsed.data.kind === UserKind.CLIENT && parsed.data.orgId) {
    await prisma.orgMember.create({
      data: {
        orgId: parsed.data.orgId,
        userId: newUser.id,
        orgRole: OrgRole.MEMBER,
      },
    });
  }

  // Si es PRODUCER/TEAM y se eligió un proyecto: agregarlo
  if (
    (parsed.data.kind === UserKind.PRODUCER ||
      parsed.data.kind === UserKind.TEAM) &&
    parsed.data.projectId &&
    parsed.data.projectRole
  ) {
    const role = parsed.data.projectRole;
    // Un productor no puede crear co-managers ni aprobadores-cliente sintéticos.
    if (!meIsMaster && PRIVILEGED_PROJECT_ROLES.includes(role)) {
      redirect("/app/users?error=denied_role");
    }
    await prisma.projectMember
      .create({
        data: {
          projectId: parsed.data.projectId,
          userId: newUser.id,
          projectRole: role,
        },
      })
      .catch(() => null);
  }

  revalidatePath("/app/users");
  redirect("/app/users?ok=created");
}

async function toggleActive(formData: FormData) {
  "use server";
  const me = await requireProducerOrMaster();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, active: true, kind: true },
  });
  if (!u) return;

  // Un ADMIN nunca puede desactivarse por esta vía (evita lockout / escalada).
  if (u.kind === UserKind.ADMIN) redirect("/app/users?error=denied_target");

  if (!isMaster(me.kind)) {
    // Un productor solo gestiona equipo/clientes dentro de su ámbito,
    // nunca a otros productores ni a usuarios fuera de sus proyectos.
    if (
      u.kind === UserKind.PRODUCER ||
      u.kind === UserKind.CMS_EDITOR ||
      u.kind === UserKind.CMS_REVIEWER
    ) {
      redirect("/app/users?error=denied_target");
    }
    const inScope = await producerCanManageUser(me.id, u.id);
    if (!inScope) redirect("/app/users?error=denied_target");
  }

  await prisma.user.update({ where: { id }, data: { active: !u.active } });
  revalidatePath("/app/users");
}

async function changeKind(formData: FormData) {
  "use server";
  const me = await requireProducerOrMaster();
  if (!isMaster(me.kind)) redirect("/app/users?error=admin_only");
  const id = String(formData.get("id") ?? "");
  if (!id || id === me.id) redirect("/app/users?error=denied_target");

  const parsedKind = z.nativeEnum(UserKind).safeParse(formData.get("kind"));
  // No se permite asignar ni reasignar el rol ADMIN desde la UI.
  if (!parsedKind.success || parsedKind.data === UserKind.ADMIN) {
    redirect("/app/users?error=invalid");
  }
  const newKind = parsedKind.data;

  const target = await prisma.user.findUnique({
    where: { id },
    select: { kind: true },
  });
  if (!target) redirect("/app/users?error=denied_target");
  // Tampoco se puede degradar a un ADMIN existente.
  if (target.kind === UserKind.ADMIN) {
    redirect("/app/users?error=denied_target");
  }

  const cmsRole: CmsRole =
    newKind === UserKind.CMS_REVIEWER ? CmsRole.REVIEWER : CmsRole.EDITOR;
  await prisma.user.update({
    where: { id },
    data: { kind: newKind, role: cmsRole },
  });
  revalidatePath("/app/users");
}

export default async function UsersPage(props: {
  searchParams: Promise<{ ok?: string; error?: string; tab?: string }>;
}) {
  const me = await requireProducerOrMaster();
  const sp = await props.searchParams;
  const isAdmin = isMaster(me.kind);

  // Productor solo ve usuarios de sus proyectos
  let where: Record<string, unknown> = {};
  if (!isAdmin) {
    const myProjects = await prisma.projectMember.findMany({
      where: { userId: me.id },
      select: { projectId: true },
    });
    const projectIds = myProjects.map((p) => p.projectId);
    where = {
      OR: [
        { id: me.id },
        { projectMemberships: { some: { projectId: { in: projectIds } } } },
        // clientes de sus proyectos
        {
          orgMemberships: {
            some: {
              org: {
                clientProjects: { some: { id: { in: projectIds } } },
              },
            },
          },
        },
      ],
    };
  }

  const [users, clientOrgs, allProjects] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy: [{ active: "desc" }, { kind: "asc" }, { name: "asc" }],
      include: {
        orgMemberships: { include: { org: true } },
        projectMemberships: { include: { project: { select: { id: true, name: true } } } },
        createdBy: { select: { name: true, email: true } },
      },
    }),
    prisma.organization.findMany({
      where: { type: OrgType.CLIENT },
      orderBy: { name: "asc" },
    }),
    isAdmin
      ? prisma.project.findMany({ orderBy: { updatedAt: "desc" } })
      : prisma.project.findMany({
          where: {
            members: { some: { userId: me.id } },
          },
          orderBy: { updatedAt: "desc" },
        }),
  ]);

  const allowedKinds = creatableKinds(me.kind);

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8">
        <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
          {isAdmin ? "Administración · Equipo" : "Mi equipo"}
        </div>
        <h1
          className="mt-1 font-heading text-white"
          style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
        >
          Personas
        </h1>
        <p className="mt-2 max-w-2xl text-[14px] text-white/55">
          {isAdmin
            ? "Crea usuarios para el equipo Labstream, productores externos, equipo audiovisual y clientes. Define el tipo y a qué tendrá acceso."
            : "Como productor puedes agregar miembros de equipo y clientes a tus proyectos."}
        </p>
      </div>

      {sp.ok === "created" && (
        <Banner kind="ok" text="Usuario creado correctamente." />
      )}
      {sp.error === "exists" && (
        <Banner kind="error" text="Ya existe un usuario con ese email." />
      )}
      {sp.error === "invalid" && (
        <Banner kind="error" text="Datos inválidos. Revisa el formulario." />
      )}
      {sp.error === "denied_kind" && (
        <Banner kind="error" text="No tienes permiso para crear ese tipo de usuario." />
      )}
      {sp.error === "admin_only" && (
        <Banner kind="error" text="Solo el Administrador puede cambiar el tipo de un usuario." />
      )}
      {sp.error === "denied_scope" && (
        <Banner kind="error" text="No puedes asignar usuarios a esa organización o proyecto." />
      )}
      {sp.error === "denied_role" && (
        <Banner kind="error" text="No tienes permiso para asignar ese rol de proyecto." />
      )}
      {sp.error === "denied_target" && (
        <Banner kind="error" text="No tienes permiso para gestionar a ese usuario." />
      )}

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Persona</th>
              <th className="px-5 py-3 font-medium">Tipo</th>
              <th className="px-5 py-3 font-medium">Pertenece a</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
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
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={u.name ?? u.email}
                      email={u.email}
                      kind={u.kind}
                      size="md"
                    />
                    <div className="min-w-0">
                      <div className="truncate font-medium text-white">{u.name ?? "—"}</div>
                      <div className="truncate text-[12px] text-white/45">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">
                  {isAdmin ? (
                    <form action={changeKind} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={u.id} />
                      <select
                        name="kind"
                        defaultValue={u.kind}
                        className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-white"
                        disabled={u.kind === UserKind.ADMIN}
                      >
                        {Object.entries(USER_KIND_LABELS).map(([k, v]) => (
                          <option key={k} value={k} disabled={k === UserKind.ADMIN}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <button
                        type="submit"
                        className="rounded-md border border-white/10 px-1.5 py-1 text-[10px] text-white/60 hover:bg-white/5"
                        disabled={u.kind === UserKind.ADMIN}
                      >
                        OK
                      </button>
                    </form>
                  ) : (
                    <KindBadge kind={u.kind} />
                  )}
                </td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1">
                    {u.orgMemberships.map((m) => (
                      <span
                        key={m.id}
                        className="rounded-full border border-white/10 px-2 py-0.5 text-[11px] text-white/70"
                      >
                        {m.org.name}
                      </span>
                    ))}
                    {u.projectMemberships.map((pm) => (
                      <span
                        key={pm.id}
                        className="rounded-full border border-orange/30 bg-orange/5 px-2 py-0.5 text-[11px] text-orange/85"
                      >
                        {pm.project.name}
                      </span>
                    ))}
                    {u.orgMemberships.length === 0 &&
                      u.projectMemberships.length === 0 && (
                        <span className="text-[12px] text-white/40">—</span>
                      )}
                  </div>
                </td>
                <td className="px-5 py-3">
                  <span
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                    style={{
                      background: u.active
                        ? "rgba(34,197,94,0.13)"
                        : "rgba(239,68,68,0.13)",
                      color: u.active ? "#7DEEA0" : "#FFA1A1",
                    }}
                  >
                    {u.active ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {u.kind !== UserKind.ADMIN && (
                    <form action={toggleActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <button
                        type="submit"
                        className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
                      >
                        {u.active ? "Desactivar" : "Activar"}
                      </button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="new-user" className="mt-12">
        <h2 className="mb-2 text-[16px] font-semibold text-white">
          Crear nueva persona
        </h2>
        <p className="mb-4 text-[13px] text-white/55">
          {isAdmin
            ? "Como Administrador puedes crear cualquier tipo de usuario."
            : "Como Productor puedes crear miembros de equipo y clientes para tus proyectos."}
        </p>
        <form
          action={createUser}
          className="lg grid grid-cols-1 gap-4 rounded-2xl p-6 md:grid-cols-2"
        >
          <Field label="Nombre completo" name="name" required />
          <Field label="Email" name="email" type="email" required />
          <Field
            label="Contraseña inicial"
            name="password"
            type="password"
            required
            hint="Mínimo 8 caracteres. El usuario podrá cambiarla luego."
          />

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Tipo de usuario
            </span>
            <select
              name="kind"
              defaultValue={allowedKinds[0]}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
            >
              {allowedKinds.map((k) => (
                <option key={k} value={k}>
                  {USER_KIND_LABELS[k]} — {USER_KIND_DESCRIPTIONS[k]}
                </option>
              ))}
            </select>
          </label>

          {/* Si es CLIENT, ofrecer asignar org */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Si es Cliente — Organización (opcional)
            </span>
            <select
              name="orgId"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            >
              <option value="">Ninguna por ahora</option>
              {clientOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>

          {/* Si es PRODUCER/TEAM, ofrecer asignar proyecto + rol */}
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Si es Equipo/Productor — Proyecto (opcional)
            </span>
            <select
              name="projectId"
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            >
              <option value="">No asignar a proyecto ahora</option>
              {allProjects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
              Rol en el proyecto (si aplica)
            </span>
            <select
              name="projectRole"
              defaultValue={ProjectRole.PRODUCTION_ASSISTANT}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white"
            >
              {Object.entries(PROJECT_ROLE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>

          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Crear persona
            </button>
          </div>
        </form>
      </div>

      {isAdmin && (
        <div className="mt-10 lg rounded-2xl p-5">
          <h3 className="mb-3 text-[13px] font-semibold uppercase tracking-wider text-white/55">
            Tipos de usuario · referencia rápida
          </h3>
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {Object.entries(USER_KIND_LABELS).map(([k]) => (
              <li key={k} className="rounded-lg border border-white/5 p-3">
                <div className="flex items-center gap-2">
                  <KindBadge kind={k as UserKind} />
                </div>
                <p className="mt-1 text-[12px] text-white/65">
                  {USER_KIND_DESCRIPTIONS[k as UserKind]}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function KindBadge({ kind }: { kind: UserKind }) {
  const map: Record<UserKind, { bg: string; color: string }> = {
    ADMIN: { bg: "rgba(232,100,12,0.18)", color: "#FFB174" },
    CMS_EDITOR: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    CMS_REVIEWER: { bg: "rgba(123,97,255,0.10)", color: "#9B89E5" },
    PRODUCER: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
    TEAM: { bg: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.75)" },
    CLIENT: { bg: "rgba(245,158,11,0.13)", color: "#FBC272" },
  };
  const s = map[kind];
  return (
    <span
      className="whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {USER_KIND_LABELS[kind]}
    </span>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  hint,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
      </span>
      <input
        type={type}
        name={name}
        required={required}
        className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
      />
      {hint && <span className="text-[11px] text-white/40">{hint}</span>}
    </label>
  );
}

function Banner({ kind, text }: { kind: "ok" | "error"; text: string }) {
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
