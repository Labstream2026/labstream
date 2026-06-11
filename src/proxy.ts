import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Ruteo por host (Next 16 — antes "middleware").
 *
 * El portal del equipo/clientes vive en `clientes.labstreamsas.com`, que apunta
 * al MISMO contenedor Next.js que la web pública (`labstreamsas.com`). Para que
 * la "entrada" de ese subdominio sea la webapp y no el sitio de marketing,
 * redirigimos la raíz `/` de `clientes.*` hacia `/app`.
 *
 * `labstreamsas.com` no se ve afectado (sigue mostrando la web pública).
 */
export function proxy(request: NextRequest) {
  // Detrás del reverse proxy de DSM el Host real llega en X-Forwarded-Host.
  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    "";
  const proto = request.headers.get("x-forwarded-proto") ?? "https";

  if (host.startsWith("clientes.") && request.nextUrl.pathname === "/") {
    return NextResponse.redirect(`${proto}://${host}/app`);
  }

  return NextResponse.next();
}

export const config = {
  // Solo la raíz; evita correr en assets, API e imágenes.
  matcher: "/",
};
