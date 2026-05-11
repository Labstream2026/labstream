import { redirect } from "next/navigation";
import { UserKind } from "@prisma/client";
import { auth } from "@/auth";

/**
 * El "Super Admin" del sistema completo es el `kind === ADMIN`.
 * Solo este tipo de usuario entra al área `/admin` (gestión de usuarios + roles).
 */
export function canAccessAdmin(kind: UserKind | null | undefined): boolean {
  return kind === UserKind.ADMIN;
}

export async function requireAdminUser() {
  const session = await auth();
  if (!session?.user) {
    redirect("/cms/login?next=/admin");
  }
  if (!canAccessAdmin(session.user.kind)) {
    // Manda al área que sí puede ver
    if (
      session.user.kind === UserKind.CMS_EDITOR ||
      session.user.kind === UserKind.CMS_REVIEWER
    ) {
      redirect("/cms?denied_admin=1");
    }
    redirect("/app?denied_admin=1");
  }
  return session.user;
}
