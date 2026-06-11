import { NextResponse } from "next/server";
import { UserKind } from "@prisma/client";
import { auth } from "@/auth";
import { publicBase } from "@/lib/public-url";

/**
 * Después del login, redirige según el tipo de usuario:
 *  - ADMIN → /admin (super admin entra al panel completo)
 *  - CMS_EDITOR / CMS_REVIEWER → /cms
 *  - PRODUCER / TEAM / CLIENT → /app
 */
export async function GET(req: Request) {
  const base = publicBase(req);
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/cms/login", base));
  }
  const kind = session.user.kind;
  const target =
    kind === UserKind.ADMIN
      ? "/admin"
      : kind === UserKind.CMS_EDITOR || kind === UserKind.CMS_REVIEWER
        ? "/cms"
        : "/app";
  return NextResponse.redirect(new URL(target, base));
}
