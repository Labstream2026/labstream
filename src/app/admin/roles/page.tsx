import Link from "next/link";
import { UserKind } from "@prisma/client";
import { requireAdminUser } from "@/lib/admin-guards";
import { USER_KIND_LABELS, USER_KIND_DESCRIPTIONS } from "@/lib/app-guards";

type Capability = {
  label: string;
  area: "cms" | "app" | "admin";
};

const CAPABILITIES: Capability[] = [
  { label: "Editar contenido público (CMS)", area: "cms" },
  { label: "Aprobar publicaciones", area: "cms" },
  { label: "Ver leads / mensajes recibidos", area: "cms" },
  { label: "Crear y gestionar proyectos", area: "app" },
  { label: "Asignar equipo a proyectos", area: "app" },
  { label: "Ver proyectos asignados", area: "app" },
  { label: "Aprobar entregables como cliente", area: "app" },
  { label: "Crear / eliminar usuarios", area: "admin" },
  { label: "Cambiar tipo de usuario (rol)", area: "admin" },
  { label: "Resetear contraseñas de cualquiera", area: "admin" },
];

// Matriz: por cada Kind, qué capabilities tiene (true/false)
const MATRIX: Record<UserKind, boolean[]> = {
  ADMIN: [true, true, true, true, true, true, true, true, true, true],
  CMS_EDITOR: [true, false, true, false, false, false, false, false, false, false],
  CMS_REVIEWER: [false, true, true, false, false, false, false, false, false, false],
  PRODUCER: [false, false, false, true, true, true, false, false, false, false],
  TEAM: [false, false, false, false, false, true, false, false, false, false],
  CLIENT: [false, false, false, false, false, true, true, false, false, false],
};

const KIND_ORDER: UserKind[] = [
  UserKind.ADMIN,
  UserKind.CMS_EDITOR,
  UserKind.CMS_REVIEWER,
  UserKind.PRODUCER,
  UserKind.TEAM,
  UserKind.CLIENT,
];

const AREA_LABELS: Record<Capability["area"], string> = {
  cms: "Portal CMS",
  app: "Web App",
  admin: "Super Admin",
};

const AREA_COLORS: Record<Capability["area"], string> = {
  cms: "text-purple-300",
  app: "text-cyan-300",
  admin: "text-orange",
};

export default async function AdminRolesPage() {
  await requireAdminUser();

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
            Roles & permisos
          </h1>
          <p className="mt-2 max-w-2xl text-[14px] text-white/55">
            Referencia visual de qué puede hacer cada tipo de usuario. Los
            permisos están definidos en código — esta vista es para guiar
            decisiones al asignar roles.
          </p>
        </div>
        <Link href="/admin/users" className="btn-primary">
          Ir a usuarios →
        </Link>
      </div>

      {/* Matriz */}
      <div className="lg overflow-hidden rounded-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.03]">
                <th className="sticky left-0 z-10 bg-[#0a0a0a] px-5 py-4 text-left text-[10px] font-semibold uppercase tracking-wider text-white/45">
                  Capacidad
                </th>
                {KIND_ORDER.map((k) => (
                  <th key={k} className="px-3 py-4 text-center">
                    <div className="text-[11px] font-semibold text-white">
                      {USER_KIND_LABELS[k]}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((cap, i) => (
                <tr
                  key={i}
                  className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]"
                >
                  <td className="sticky left-0 bg-[#0a0a0a] px-5 py-3">
                    <div className="text-[13px] text-white/85">{cap.label}</div>
                    <div
                      className={`text-[10px] uppercase tracking-wider ${AREA_COLORS[cap.area]}`}
                    >
                      {AREA_LABELS[cap.area]}
                    </div>
                  </td>
                  {KIND_ORDER.map((k) => (
                    <td key={k} className="px-3 py-3 text-center">
                      {MATRIX[k][i] ? (
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-500/20 text-[12px] text-green-300">
                          ✓
                        </span>
                      ) : (
                        <span className="text-white/15">—</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detalle por tipo */}
      <section className="mt-10">
        <h2 className="mb-6 font-heading text-white" style={{ fontSize: 24 }}>
          Cada tipo, en una línea
        </h2>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {KIND_ORDER.map((k) => (
            <div key={k} className="lg rounded-xl p-5">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-[14px] font-semibold text-white">
                  {USER_KIND_LABELS[k]}
                </span>
              </div>
              <p className="text-[13px] leading-relaxed text-white/70">
                {USER_KIND_DESCRIPTIONS[k]}
              </p>
              <div className="mt-3 flex gap-2 text-[11px] uppercase tracking-wider">
                {(["cms", "app", "admin"] as const).map((area) => {
                  const hasArea = CAPABILITIES.some(
                    (c, i) => c.area === area && MATRIX[k][i],
                  );
                  return (
                    <span
                      key={area}
                      className={`rounded-full border px-2 py-0.5 ${
                        hasArea
                          ? `border-white/20 ${AREA_COLORS[area]}`
                          : "border-white/5 text-white/20"
                      }`}
                    >
                      {AREA_LABELS[area]}
                    </span>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
