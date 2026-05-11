import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { CmsRole, UserKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminUser } from "@/lib/admin-guards";
import { setError, setSuccess } from "@/lib/cms-flash";
import { USER_KIND_LABELS, USER_KIND_DESCRIPTIONS } from "@/lib/app-guards";

const KIND_STYLES: Record<UserKind, string> = {
  ADMIN: "bg-orange/15 text-orange border-orange/40",
  CMS_EDITOR: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  CMS_REVIEWER: "bg-purple-500/10 text-purple-300/85 border-purple-500/25",
  PRODUCER: "bg-blue-500/15 text-blue-300 border-blue-500/30",
  TEAM: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  CLIENT: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

/** Texto de avatar a partir del nombre o email */
function initials(name: string | null, email: string): string {
  const src = (name ?? email).trim();
  if (!src) return "?";
  const parts = src.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

const newUserSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
  kind: z.enum([
    UserKind.ADMIN,
    UserKind.CMS_EDITOR,
    UserKind.CMS_REVIEWER,
    UserKind.PRODUCER,
    UserKind.TEAM,
    UserKind.CLIENT,
  ]),
  password: z.string().min(8).max(120),
});

async function createUser(formData: FormData) {
  "use server";
  await requireAdminUser();

  const parsed = newUserSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    name: String(formData.get("name") ?? "").trim(),
    kind: String(formData.get("kind") ?? UserKind.TEAM),
    password: String(formData.get("password") ?? ""),
  });
  if (!parsed.success) {
    await setError("Revisa los datos: email válido, nombre, password mínimo 8 caracteres.");
    redirect("/admin/users");
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) {
    await setError(`Ya existe un usuario con ese email.`);
    redirect("/admin/users");
  }

  const cmsRole: CmsRole =
    parsed.data.kind === UserKind.ADMIN
      ? CmsRole.SUPER_ADMIN
      : parsed.data.kind === UserKind.CMS_REVIEWER
        ? CmsRole.REVIEWER
        : CmsRole.EDITOR;

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      kind: parsed.data.kind,
      role: cmsRole,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  });

  revalidatePath("/admin/users");
  await setSuccess(`Usuario "${parsed.data.name}" creado.`);
  redirect("/admin/users");
}

async function changeKind(formData: FormData) {
  "use server";
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const newKind = String(formData.get("kind") ?? UserKind.TEAM) as UserKind;

  const cmsRole: CmsRole =
    newKind === UserKind.ADMIN
      ? CmsRole.SUPER_ADMIN
      : newKind === UserKind.CMS_REVIEWER
        ? CmsRole.REVIEWER
        : CmsRole.EDITOR;

  await prisma.user.update({
    where: { id },
    data: { kind: newKind, role: cmsRole },
  });
  revalidatePath("/admin/users");
  await setSuccess("Tipo de usuario actualizado.");
  redirect("/admin/users");
}

async function toggleActive(formData: FormData) {
  "use server";
  const me = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id === me.id) {
    await setError("No puedes desactivarte a ti mismo.");
    redirect("/admin/users");
  }
  const u = await prisma.user.findUnique({ where: { id } });
  if (!u) return;
  await prisma.user.update({
    where: { id },
    data: { active: !u.active },
  });
  revalidatePath("/admin/users");
  await setSuccess(u.active ? "Usuario desactivado." : "Usuario reactivado.");
  redirect("/admin/users");
}

async function resetPassword(formData: FormData) {
  "use server";
  await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  if (newPassword.length < 8) {
    await setError("La nueva contraseña debe tener al menos 8 caracteres.");
    redirect("/admin/users");
  }
  await prisma.user.update({
    where: { id },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  revalidatePath("/admin/users");
  await setSuccess("Contraseña actualizada.");
  redirect("/admin/users");
}

async function deleteUser(formData: FormData) {
  "use server";
  const me = await requireAdminUser();
  const id = String(formData.get("id") ?? "");
  if (id === me.id) {
    await setError("No puedes eliminarte a ti mismo.");
    redirect("/admin/users");
  }
  await prisma.user.delete({ where: { id } });
  revalidatePath("/admin/users");
  await setSuccess("Usuario eliminado.");
  redirect("/admin/users");
}

export default async function AdminUsersPage(props: {
  searchParams: Promise<{ kind?: string; q?: string; action?: string }>;
}) {
  const me = await requireAdminUser();
  const sp = await props.searchParams;
  const kindFilter = (Object.values(UserKind) as string[]).includes(sp.kind ?? "")
    ? (sp.kind as UserKind)
    : null;
  const q = sp.q?.trim() ?? "";
  const showCreate = sp.action === "new";

  const users = await prisma.user.findMany({
    where: {
      ...(kindFilter ? { kind: kindFilter } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { email: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });

  const counts = await prisma.user.groupBy({ by: ["kind"], _count: true });
  const kindCounts = Object.fromEntries(
    counts.map((c) => [c.kind, c._count]),
  ) as Record<UserKind, number>;
  const total = counts.reduce((s, c) => s + c._count, 0);

  return (
    <div className="px-5 py-8 md:px-10 md:py-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            Super Admin
          </div>
          <h1
            className="mt-1 font-heading italic text-white"
            style={{ fontSize: 44, lineHeight: 1.05, letterSpacing: "-1.5px" }}
          >
            Usuarios
          </h1>
          <p className="mt-2 max-w-xl text-[14px] text-white/55">
            Crea cuentas, asigna tipo (rol) y administra permisos. El tipo
            determina a qué áreas entra cada persona.
          </p>
        </div>

        <Link
          href={showCreate ? "/admin/users" : "/admin/users?action=new"}
          className={`btn-primary ${showCreate ? "opacity-50" : ""}`}
        >
          {showCreate ? "Cerrar formulario" : "+ Crear usuario"}
        </Link>
      </div>

      {/* Create wizard */}
      {showCreate && (
        <div className="mb-10 lg rounded-2xl p-6 md:p-8">
          <h2 className="mb-1 font-heading text-white" style={{ fontSize: 22 }}>
            Nuevo usuario
          </h2>
          <p className="mb-6 text-[13px] text-white/55">
            El tipo elegido define automáticamente las áreas a las que entra.
          </p>
          <form action={createUser} className="flex flex-col gap-5">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Labeled label="Nombre completo" required>
                <Input name="name" required placeholder="Ana Torres" />
              </Labeled>
              <Labeled label="Email" required>
                <Input
                  name="email"
                  type="email"
                  required
                  placeholder="ana@labstream.co"
                />
              </Labeled>
            </div>

            <div>
              <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-white/50">
                Tipo de usuario
              </span>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {(Object.keys(USER_KIND_LABELS) as UserKind[]).map((k) => (
                  <label
                    key={k}
                    className="flex cursor-pointer flex-col gap-1 rounded-xl border border-white/10 bg-white/[0.02] p-3 transition-all hover:border-white/20 has-[:checked]:border-orange/50 has-[:checked]:bg-orange/[0.06]"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="kind"
                        value={k}
                        defaultChecked={k === UserKind.TEAM}
                        className="accent-orange"
                      />
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLES[k]}`}
                      >
                        {USER_KIND_LABELS[k]}
                      </span>
                    </div>
                    <span className="text-[12px] text-white/55">
                      {USER_KIND_DESCRIPTIONS[k]}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <Labeled
              label="Contraseña inicial"
              required
              help="Mínimo 8 caracteres. El usuario podrá cambiarla luego."
            >
              <Input
                name="password"
                type="password"
                required
                minLength={8}
                placeholder="••••••••"
              />
            </Labeled>

            <div className="flex justify-end gap-3 border-t border-white/5 pt-5">
              <Link
                href="/admin/users"
                className="rounded-md border border-white/10 px-4 py-2.5 text-[13px] text-white/70 hover:bg-white/5"
              >
                Cancelar
              </Link>
              <button type="submit" className="btn-primary">
                Crear usuario
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search */}
      <form
        method="GET"
        action="/admin/users"
        className="mb-4 flex flex-wrap items-center gap-2"
      >
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Buscar por nombre o email…"
          className="min-w-[260px] flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white focus:border-orange/50 focus:outline-none"
        />
        {kindFilter && <input type="hidden" name="kind" value={kindFilter} />}
        <button
          type="submit"
          className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-[12px] text-white hover:bg-white/10"
        >
          Buscar
        </button>
        {(q || kindFilter) && (
          <a
            href="/admin/users"
            className="rounded-md px-3 py-2 text-[12px] text-white/55 hover:text-white"
          >
            Limpiar
          </a>
        )}
      </form>

      {/* Filtros por tipo */}
      <div className="mb-6 flex flex-wrap gap-1.5">
        <FilterChip
          href={`/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`}
          active={!kindFilter}
          label={`Todos (${total})`}
        />
        {(Object.keys(USER_KIND_LABELS) as UserKind[]).map((k) => (
          <FilterChip
            key={k}
            href={`/admin/users?kind=${k}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
            active={kindFilter === k}
            label={`${USER_KIND_LABELS[k]} (${kindCounts[k] ?? 0})`}
          />
        ))}
      </div>

      {/* Lista */}
      {users.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          {q || kindFilter
            ? "Ningún usuario coincide con tu búsqueda."
            : "No hay usuarios todavía."}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {users.map((u) => (
            <div
              key={u.id}
              className={`lg rounded-2xl p-5 transition-opacity ${
                u.active ? "" : "opacity-50"
              }`}
            >
              <div className="flex flex-wrap items-start gap-4">
                {/* Avatar */}
                <div
                  className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full font-heading italic text-white ${KIND_STYLES[u.kind].split(" ")[0]} ${KIND_STYLES[u.kind].split(" ")[2]}`}
                  style={{ fontSize: 16 }}
                >
                  {initials(u.name, u.email)}
                </div>

                {/* Info */}
                <div className="flex flex-1 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[15px] font-semibold text-white">
                      {u.name ?? "Sin nombre"}
                    </span>
                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${KIND_STYLES[u.kind]}`}
                    >
                      {USER_KIND_LABELS[u.kind]}
                    </span>
                    {!u.active && (
                      <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white/45">
                        Inactivo
                      </span>
                    )}
                    {u.id === me.id && (
                      <span className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-orange">
                        Tú
                      </span>
                    )}
                  </div>
                  <a
                    href={`mailto:${u.email}`}
                    className="text-[13px] text-orange hover:underline"
                  >
                    {u.email}
                  </a>
                  <div className="mt-0.5 text-[11px] text-white/40">
                    {u.lastLoginAt
                      ? `Último login: ${new Date(u.lastLoginAt).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}`
                      : "Sin logins aún"}
                    {" · "}
                    Creado {new Date(u.createdAt).toLocaleDateString("es-CO")}
                  </div>
                </div>
              </div>

              {/* Acciones */}
              <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-white/5 pt-4">
                <form action={changeKind} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/45">
                      Cambiar tipo
                    </span>
                    <select
                      name="kind"
                      defaultValue={u.kind}
                      disabled={u.id === me.id}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12px] text-white focus:border-orange/50 focus:outline-none disabled:opacity-40"
                    >
                      {(Object.keys(USER_KIND_LABELS) as UserKind[]).map((k) => (
                        <option key={k} value={k}>
                          {USER_KIND_LABELS[k]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    type="submit"
                    disabled={u.id === me.id}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Aplicar
                  </button>
                </form>

                <form action={resetPassword} className="flex items-end gap-2">
                  <input type="hidden" name="id" value={u.id} />
                  <label className="flex flex-col gap-1">
                    <span className="text-[10px] uppercase tracking-wider text-white/45">
                      Resetear contraseña
                    </span>
                    <input
                      name="newPassword"
                      type="password"
                      placeholder="Mín 8 caracteres"
                      minLength={8}
                      className="w-44 rounded-md border border-white/10 bg-white/[0.04] px-2 py-1.5 text-[12px] text-white focus:border-orange/50 focus:outline-none"
                    />
                  </label>
                  <button
                    type="submit"
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white hover:bg-white/10"
                  >
                    Resetear
                  </button>
                </form>

                <div className="ml-auto flex gap-2">
                  <form action={toggleActive} className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      disabled={u.id === me.id}
                      className="rounded-md border border-white/10 px-3 py-1.5 text-[12px] text-white/65 hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {u.active ? "Desactivar" : "Reactivar"}
                    </button>
                  </form>
                  <form action={deleteUser} className="inline">
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      disabled={u.id === me.id}
                      className="rounded-md border border-red-500/20 px-3 py-1.5 text-[12px] text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                      title="Eliminar permanentemente"
                    >
                      Eliminar
                    </button>
                  </form>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Labeled({
  label,
  help,
  required,
  children,
}: {
  label: string;
  help?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-white/50">
        {label}
        {required && <span className="text-orange">*</span>}
      </span>
      {children}
      {help && <span className="text-[11px] text-white/40">{help}</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:border-orange/50 focus:outline-none ${props.className ?? ""}`}
    />
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-full border px-3 py-1 text-[12px] transition-colors ${
        active
          ? "border-orange/40 bg-orange/15 text-orange"
          : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
