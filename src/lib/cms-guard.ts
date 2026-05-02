import { redirect } from "next/navigation";
import { CmsRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireCmsUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/cms/login");
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
 * - SUPER_ADMIN: always true
 * - EDITOR: only if assigned to the page (PageAssignment.canEdit)
 * - REVIEWER: read-only for now
 */
export async function canEditPage(
  userId: string,
  role: CmsRole,
  pageId: string,
): Promise<boolean> {
  if (role === CmsRole.SUPER_ADMIN) return true;
  if (role !== CmsRole.EDITOR) return false;
  const a = await prisma.pageAssignment.findUnique({
    where: { pageId_userId: { pageId, userId } },
  });
  return Boolean(a?.canEdit);
}

/** Throws via redirect if user cannot edit the given page. */
export async function requirePageEditor(pageId: string) {
  const me = await requireCmsUser();
  const ok = await canEditPage(me.id, me.role, pageId);
  if (!ok) redirect("/cms/pages?error=denied");
  return me;
}

/**
 * List page IDs the user is allowed to see in the CMS.
 * - SUPER_ADMIN, REVIEWER: all
 * - EDITOR: only assigned pages
 */
export async function listAccessiblePageIds(
  userId: string,
  role: CmsRole,
): Promise<{ all: true } | { all: false; ids: string[] }> {
  if (role === CmsRole.SUPER_ADMIN || role === CmsRole.REVIEWER) {
    return { all: true };
  }
  const assignments = await prisma.pageAssignment.findMany({
    where: { userId },
    select: { pageId: true },
  });
  return { all: false, ids: assignments.map((a) => a.pageId) };
}
