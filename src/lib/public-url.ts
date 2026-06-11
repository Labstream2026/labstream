/**
 * Base pública del sitio para construir redirecciones absolutas.
 *
 * Soporta MÚLTIPLES dominios sobre el mismo contenedor (labstreamsas.com para la
 * web pública, clientes.labstreamsas.com para el portal). Por eso preferimos el
 * host real que reenvía el reverse proxy de DSM (X-Forwarded-Host) para quedarnos
 * en el mismo dominio tras un login/redirect. Si el proxy no lo reenvía (llega el
 * host interno 0.0.0.0:3000), caemos a NEXTAUTH_URL y por último al origin.
 */
export function publicBase(req: Request): string {
  const fwdHost = req.headers.get("x-forwarded-host");
  const fwdProto = req.headers.get("x-forwarded-proto") ?? "https";
  if (fwdHost && !fwdHost.startsWith("0.0.0.0") && !fwdHost.startsWith("127.")) {
    return `${fwdProto}://${fwdHost}`;
  }
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  return new URL(req.url).origin;
}
