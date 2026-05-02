import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireSuperAdmin } from "@/lib/cms-guard";
import { CmsRole } from "@prisma/client";

const newUserSchema = z.object({
  email: z.string().email().max(160),
  name: z.string().min(1).max(120),
  role: z.enum([CmsRole.SUPER_ADMIN, CmsRole.EDITOR, CmsRole.REVIEWER]),
  password: z.string().min(8).max(120),
});

async function createUser(formData: FormData) {
  "use server";
  const me = await requireSuperAdmin();

  const parsed = newUserSchema.safeParse({
    email: String(formData.get("email") ?? "").toLowerCase().trim(),
    name: String(formData.get("name") ?? "").trim(),
    role: String(formData.get("role") ?? CmsRole.EDITOR),
    password: String(formData.get("password") ?? ""),
  });

  if (!parsed.success) {
    redirect("/cms/users?error=invalid");
  }

  const exists = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (exists) {
    redirect("/cms/users?error=exists");
  }

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      name: parsed.data.name,
      role: parsed.data.role,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
      createdById: me.id,
    },
  });

  revalidatePath("/cms/users");
  redirect("/cms/users?ok=created");
}

async function toggleActive(formData: FormData) {
  "use server";
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return;
  await prisma.user.update({
    where: { id },
    data: { active: !user.active },
  });
  revalidatePath("/cms/users");
}

async function changeRole(formData: FormData) {
  "use server";
  await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? CmsRole.EDITOR) as CmsRole;
  await prisma.user.update({ where: { id }, data: { role } });
  revalidatePath("/cms/users");
}

export default async function UsersPage(props: {
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireSuperAdmin();
  const sp = await props.searchParams;

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    include: { createdBy: { select: { name: true, email: true } } },
  });

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-[12px] font-semibold uppercase tracking-widest text-orange">
            Equipo
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 38, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            Usuarios del CMS
          </h1>
          <p className="mt-2 text-[14px] text-white/55">
            Crea cuentas para tu equipo. Cada usuario edita según su rol.
          </p>
        </div>
        <Link
          href="#new-user"
          className="btn-primary"
        >
          + Nuevo usuario
        </Link>
      </div>

      {sp.ok === "created" && (
        <Banner kind="ok" text="Usuario creado correctamente." />
      )}
      {sp.error === "exists" && (
        <Banner kind="error" text="Ese email ya está registrado." />
      )}
      {sp.error === "invalid" && (
        <Banner kind="error" text="Datos inválidos. Revisa el formulario." />
      )}

      <div className="lg overflow-x-auto rounded-2xl">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr
              className="border-b text-[11px] uppercase tracking-wider text-white/45"
              style={{ borderColor: "var(--border)" }}
            >
              <th className="px-5 py-3 font-medium">Usuario</th>
              <th className="px-5 py-3 font-medium">Rol</th>
              <th className="px-5 py-3 font-medium">Estado</th>
              <th className="px-5 py-3 font-medium">Creado por</th>
              <th className="px-5 py-3 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-b text-white/85"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="px-5 py-3">
                  <div className="font-medium text-white">{u.name ?? "—"}</div>
                  <div className="text-[12px] text-white/45">{u.email}</div>
                </td>
                <td className="px-5 py-3">
                  <form action={changeRole} className="flex items-center gap-2">
                    <input type="hidden" name="id" value={u.id} />
                    <select
                      name="role"
                      defaultValue={u.role}
                      className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[12px] text-white"
                    >
                      <option value={CmsRole.SUPER_ADMIN}>Super Admin</option>
                      <option value={CmsRole.EDITOR}>Editor</option>
                      <option value={CmsRole.REVIEWER}>Revisor</option>
                    </select>
                    <button
                      type="submit"
                      className="rounded-md border border-white/10 px-2 py-1 text-[11px] text-white/60 hover:bg-white/5 hover:text-white"
                    >
                      Guardar
                    </button>
                  </form>
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
                <td className="px-5 py-3 text-white/55">
                  {u.createdBy?.name ?? u.createdBy?.email ?? "—"}
                </td>
                <td className="px-5 py-3">
                  <form action={toggleActive}>
                    <input type="hidden" name="id" value={u.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      {u.active ? "Desactivar" : "Activar"}
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div id="new-user" className="mt-12">
        <h2 className="mb-4 text-[16px] font-semibold text-white">
          Crear nuevo usuario
        </h2>
        <form
          action={createUser}
          className="lg grid grid-cols-1 gap-4 rounded-2xl p-6 md:grid-cols-2"
        >
          <Field label="Nombre" name="name" required />
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
              Rol
            </span>
            <select
              name="role"
              defaultValue={CmsRole.EDITOR}
              className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[14px] text-white focus:border-orange/50 focus:outline-none"
            >
              <option value={CmsRole.SUPER_ADMIN}>Super Admin (control total)</option>
              <option value={CmsRole.EDITOR}>Editor (edita páginas)</option>
              <option value={CmsRole.REVIEWER}>Revisor (revisa y aprueba)</option>
            </select>
          </label>
          <div className="md:col-span-2">
            <button type="submit" className="btn-primary">
              Crear usuario
            </button>
          </div>
        </form>
      </div>
    </div>
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
