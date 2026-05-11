import { NextResponse } from "next/server";
import { UserKind } from "@prisma/client";
import { auth } from "@/auth";

/**
 * Después del login, redirige según el tipo de usuario:
 *  - ADMIN → /admin (super admin entra al panel completo)
 *  - CMS_EDITOR / CMS_REVIEWER → /cms
 *  - PRODUCER / TEAM / CLIENT → /app
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/cms/login", req.url));
  }
  const kind = session.user.kind;
  const target =
    kind === UserKind.ADMIN
      ? "/admin"
      : kind === UserKind.CMS_EDITOR || kind === UserKind.CMS_REVIEWER
        ? "/cms"
        : "/app";
  return NextResponse.redirect(new URL(target, req.url));
}
