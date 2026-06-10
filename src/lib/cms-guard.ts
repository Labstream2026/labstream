import { redirect } from "next/navigation";
import { CmsRole, UserKind } from "@prisma/client";
import { auth } from "@/auth";

/**
 * Tipos de usuario que pueden entrar al CMS.
 * Productor / Cliente / Equipo NO entran al CMS — son redirigidos a /app.
 */
export function canAccessCms(kind: UserKind | null | undefined): boolean {
  return (
    kind === UserKind.ADMIN ||
    kind === UserKind.CMS_EDITOR ||
    kind === UserKind.CMS_REVIEWER
  );
}

export async function requireCmsUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/cms/login?next=/cms");
  }
  if (!canAccessCms(session.user.kind)) {
    redirect("/app?denied_cms=1");
  }
  return session.user;
}

export async function requireSuperAdmin() {
  const user = await requireCmsUser();
  if (user.role !== CmsRole.SUPER_ADMIN) {
    redirect("/cms?denied=1");
  }
  return user;
}

export function isSuperAdmin(role: CmsRole): boolean {
  return role === CmsRole.SUPER_ADMIN;
}

export function canEditPages(role: CmsRole): boolean {
  return role === CmsRole.SUPER_ADMIN || role === CmsRole.EDITOR;
}

export function canReview(role: CmsRole): boolean {
  return role === CmsRole.SUPER_ADMIN || role === CmsRole.REVIEWER;
}

/**
 * Returns true if the user can edit the given page.
 * Cualquiera con acceso al CMS (Admin, Editor, Reviewer) puede editar páginas.
 * Reviewer puede editar también — lo dejamos abierto. Si quieres restricción
 * de "solo lectura para Reviewer" se puede agregar después.
 */
export async function canEditPage(
  _userId: string,
  _role: CmsRole,
  _pageId: string,
): Promise<boolean> {
  return true;
}

/** Throws via redirect if user no tiene acceso al CMS. */
export async function requirePageEditor(_pageId: string) {
  return requireCmsUser();
}

/**
 * List page IDs visibles en el CMS — todos para cualquier usuario con acceso al CMS.
 */
export async function listAccessiblePageIds(
  _userId: string,
  _role: CmsRole,
): Promise<{ all: true } | { all: false; ids: string[] }> {
  return { all: true };
}
