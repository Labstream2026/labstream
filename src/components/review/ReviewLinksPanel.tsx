"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

// Suscripción a "ahora" — se actualiza cada minuto en cliente, 0 en SSR.
const subscribeMinute = (cb: () => void) => {
  if (typeof window === "undefined") return () => {};
  const t = setInterval(cb, 60_000);
  return () => clearInterval(t);
};
const getNow = () => Date.now();

export type ReviewLinkRow = {
  id: string;
  slug: string;
  title: string | null;
  message: string | null;
  allowGuests: boolean;
  allowDrawings: boolean;
  allowDownload: boolean;
  requireGuestEmail: boolean;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
  visitsCount: number;
  commentsCount: number;
};

const EXPIRY_OPTIONS = [
  { value: "never", label: "Nunca expira" },
  { value: "7d", label: "Expira en 7 días" },
  { value: "30d", label: "Expira en 30 días" },
  { value: "90d", label: "Expira en 90 días" },
];

export function ReviewLinksPanel({
  versionId,
  versionNumber,
  initialLinks,
  onCreate,
  onRevoke,
}: {
  versionId: string;
  versionNumber: number;
  initialLinks: ReviewLinkRow[];
  onCreate: (formData: FormData) => Promise<void>;
  onRevoke: (formData: FormData) => Promise<void>;
}) {
  const [open, setOpen] = useState(initialLinks.length === 0);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState<string | null>(null);

  const baseUrl =
    typeof window !== "undefined" ? window.location.origin : "";
  // useSyncExternalStore mantiene "now" actualizado sin tocar pureza del render.
  const nowMs = useSyncExternalStore(subscribeMinute, getNow, () => 0);

  function copyLink(slug: string) {
    const url = `${baseUrl}/review/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(slug);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  return (
    <div
      className="rounded-2xl p-5"
      style={{
        border: "1px solid rgba(232,100,12,0.3)",
        background: "linear-gradient(180deg, rgba(232,100,12,0.06), transparent 80%)",
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-[14px] font-semibold text-white">
            🔗 Links de revisión cliente
          </h3>
          <p className="mt-0.5 text-[11px] text-white/55">
            Comparte un link público para que cliente o invitados comenten v{versionNumber}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="text-[11px] text-orange hover:underline"
        >
          {open ? "Ocultar" : "+ Crear link"}
        </button>
      </div>

      {open && (
        <form
          action={(fd) => startTransition(() => onCreate(fd))}
          className="mb-4 flex flex-col gap-2 rounded-lg border border-white/10 bg-white/[0.04] p-3"
        >
          <input type="hidden" name="versionId" value={versionId} />
          <input
            name="title"
            placeholder="Título opcional (ej. 'Rough cut para Marta')"
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white"
          />
          <textarea
            name="message"
            rows={2}
            placeholder="Mensaje de bienvenida (opcional)"
            className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[13px] text-white"
          />
          <div className="grid grid-cols-2 gap-2">
            <select
              name="expiry"
              defaultValue="never"
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white"
            >
              {EXPIRY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value} className="bg-black">
                  {o.label}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white/85">
              <input
                type="checkbox"
                name="allowGuests"
                defaultChecked
                className="accent-orange"
              />
              Permitir invitados (sin login)
            </label>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white/85">
              <input
                type="checkbox"
                name="allowDrawings"
                defaultChecked
                className="accent-orange"
              />
              Permitir dibujos + screenshots
            </label>
            <label className="flex items-center gap-2 rounded-md border border-white/10 bg-black/30 px-3 py-2 text-[12px] text-white/85">
              <input
                type="checkbox"
                name="requireGuestEmail"
                defaultChecked
                className="accent-orange"
              />
              Pedir email al invitado
            </label>
          </div>
          <button
            type="submit"
            disabled={pending}
            className="self-start rounded-full bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange/85 disabled:opacity-50"
          >
            {pending ? "Generando…" : "Generar link"}
          </button>
        </form>
      )}

      {initialLinks.length === 0 ? (
        <p className="text-[12px] text-white/45">
          No hay links activos. Crea uno para enviarlo a tu cliente.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {initialLinks.map((l) => {
            const url = `${baseUrl}/review/${l.slug}`;
            const expired = l.expiresAt && new Date(l.expiresAt).getTime() < nowMs;
            const inactive = l.revokedAt || expired;
            return (
              <li
                key={l.id}
                className="rounded-xl border border-white/10 bg-white/[0.03] p-3"
                style={inactive ? { opacity: 0.55 } : undefined}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] font-medium text-white">
                      {l.title ?? `Link · ${new Date(l.createdAt).toLocaleDateString("es-CO")}`}
                      {l.revokedAt && (
                        <span className="ml-2 text-[10px] text-red-300">REVOCADO</span>
                      )}
                      {expired && !l.revokedAt && (
                        <span className="ml-2 text-[10px] text-amber-300">EXPIRADO</span>
                      )}
                    </div>
                    <div className="mt-0.5 truncate font-mono text-[11px] text-white/55">
                      {url}
                    </div>
                    <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-white/45">
                      <span>{l.visitsCount} visitas</span>
                      <span>·</span>
                      <span>{l.commentsCount} comentarios</span>
                      {l.allowGuests && <><span>·</span><span>invitados</span></>}
                      {l.allowDrawings && <><span>·</span><span>dibujos</span></>}
                      {l.expiresAt && !expired && (
                        <>
                          <span>·</span>
                          <span>
                            expira {new Date(l.expiresAt).toLocaleDateString("es-CO")}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {!inactive && (
                      <>
                        <button
                          type="button"
                          onClick={() => copyLink(l.slug)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-medium text-white hover:bg-white/10"
                        >
                          {copied === l.slug ? "✓ Copiado" : "Copiar"}
                        </button>
                        <a
                          href={url}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-center text-[11px] font-medium text-white hover:bg-white/10"
                        >
                          Abrir
                        </a>
                        <form action={(fd) => startTransition(() => onRevoke(fd))}>
                          <input type="hidden" name="linkId" value={l.id} />
                          <button
                            type="submit"
                            className="w-full rounded-md border border-red-500/30 bg-red-500/10 px-3 py-1 text-[11px] font-medium text-red-300 hover:bg-red-500/20"
                          >
                            Revocar
                          </button>
                        </form>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
