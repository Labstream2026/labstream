/**
 * Rate limiter en memoria, best-effort.
 *
 * Sirve como defensa en profundidad contra spam/abuso (login, contacto,
 * newsletter, subida de frames). NO es robusto en entornos serverless
 * multi-instancia — para protección fuerte usar un store compartido
 * (p. ej. Upstash/Redis). Es suficiente para frenar abuso trivial.
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * Devuelve `true` si la acción está permitida, `false` si se superó el límite.
 *
 * @param key     Identificador del cubo (ej. `login:<email>`, `frame:<slug>`).
 * @param limit   Máximo de acciones permitidas dentro de la ventana.
 * @param windowMs Tamaño de la ventana en milisegundos.
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    cleanup(now);
    return true;
  }

  if (existing.count >= limit) return false;
  existing.count += 1;
  return true;
}

/** Limpia cubos expirados ocasionalmente para no crecer sin límite. */
function cleanup(now: number) {
  if (buckets.size < 500) return;
  for (const [k, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(k);
  }
}

/** IP del cliente desde los headers del proxy (best-effort). */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
