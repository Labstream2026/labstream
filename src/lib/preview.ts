import { auth } from "@/auth";
import { canAccessCms } from "@/lib/cms-guard";

export type PreviewModel = "portfolio" | "blog" | "service" | "about";

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
