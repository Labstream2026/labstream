import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { canAccessCms } from "@/lib/cms-guard";

/** Registros únicos (su borrador vive en la columna `draft` del propio registro). */
export type PreviewModel = "portfolio" | "blog" | "service" | "about" | "home";

/** Colecciones (su borrador vive en la tabla `PreviewDraft`, key = nombre). */
export type CollectionSurface = "team" | "testimonials" | "logos" | "faqs";

/** Config global (su borrador se fusiona en `SiteSettings.draft`). */
export type ConfigSurface = "appearance" | "settings";

export const COLLECTION_SURFACES: CollectionSurface[] = [
  "team",
  "testimonials",
  "logos",
  "faqs",
];
export const CONFIG_SURFACES: ConfigSurface[] = ["appearance", "settings"];

/**
 * Devuelve true si el visitante actual está viendo la página en modo preview:
 *   - URL trae ?preview=1
 *   - El visitante tiene sesión CMS válida
 *
 * Sólo usuarios con acceso al CMS pueden ver borradores. Para todo el resto
 * (visitantes anónimos, usuarios de la webapp), `?preview=1` no tiene efecto.
 */
export async function isPreviewMode(searchParams: {
  preview?: string | string[] | undefined;
}): Promise<boolean> {
  const flag = Array.isArray(searchParams.preview)
    ? searchParams.preview[0]
    : searchParams.preview;
  if (flag !== "1") return false;
  const session = await auth();
  if (!session?.user) return false;
  return canAccessCms(session.user.kind);
}

/**
 * Une los campos del borrador encima del registro publicado.
 * - Si `draft` es null/undefined, devuelve el registro tal cual.
 * - Sólo sobreescribe campos que vengan presentes en `draft`. `null` en el
 *   borrador limpia el campo (útil para "borrar" valores en preview).
 */
export function mergeDraft<T extends Record<string, unknown>>(
  record: T,
  draft: unknown,
): T {
  if (!draft || typeof draft !== "object") return record;
  return { ...record, ...(draft as Record<string, unknown>) } as T;
}

// ─── Borradores de superficies no-registro (colecciones y config) ─────

/**
 * Lee el borrador de una colección (equipo, testimonios, logos, FAQs) desde
 * la tabla `PreviewDraft`. Devuelve el array de ítems editados, o null si no
 * hay borrador. SÓLO debe llamarse cuando `isPreviewMode` es true.
 */
export async function getCollectionDraft(
  key: CollectionSurface,
): Promise<Record<string, unknown>[] | null> {
  const row = await prisma.previewDraft.findUnique({ where: { key } });
  if (!row || !row.data || typeof row.data !== "object") return null;
  const items = (row.data as { items?: unknown }).items;
  return Array.isArray(items) ? (items as Record<string, unknown>[]) : null;
}

/**
 * Lee el borrador de la config global (apariencia + ajustes) desde
 * `SiteSettings.draft`. SÓLO debe llamarse cuando `isPreviewMode` es true.
 */
export async function getSiteDraft(): Promise<Record<string, unknown> | null> {
  const row = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { draft: true },
  });
  const d = row?.draft;
  return d && typeof d === "object" && !Array.isArray(d)
    ? (d as Record<string, unknown>)
    : null;
}

/**
 * Aplica a un borrador de colección el mismo filtro/orden que usa la página
 * pública: sólo visibles, (destacados primero), por `order` asc, y un tope
 * opcional. Replica el `where`/`orderBy`/`take` del query de Prisma.
 */
export function orderCollectionDraft<T extends Record<string, unknown>>(
  items: T[],
  opts: { featured?: boolean; take?: number } = {},
): T[] {
  let out = items.filter((it) => it && it.visible === true);
  out = out.sort((a, b) => {
    if (opts.featured) {
      const f = (b.featured ? 1 : 0) - (a.featured ? 1 : 0);
      if (f !== 0) return f;
    }
    const ao = typeof a.order === "number" ? a.order : 0;
    const bo = typeof b.order === "number" ? b.order : 0;
    return ao - bo;
  });
  return opts.take != null ? out.slice(0, opts.take) : out;
}
