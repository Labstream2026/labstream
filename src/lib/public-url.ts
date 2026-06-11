/**
 * Base pública del sitio para construir redirecciones absolutas.
 *
 * Detrás del reverse proxy de Synology DSM, el `Host` que recibe el contenedor
 * es el interno (0.0.0.0:3000), así que `req.url` no sirve para redirigir.
 * Orden de preferencia: NEXTAUTH_URL → headers X-Forwarded-* → origin de la request.
 */
export function publicBase(req: Request): string {
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (fwdHost && !fwdHost.startsWith("0.0.0.0") && !fwdHost.startsWith("127.")) {
    return `${fwdProto}://${fwdHost}`;
  }
  return new URL(req.url).origin;
}
