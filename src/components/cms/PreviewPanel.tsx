"use client";

import { useState } from "react";

/**
 * Panel de vista previa simple para páginas de gestión (listas de servicios,
 * portafolio, blog). A diferencia de LivePreview no envía borradores: muestra
 * la página pública publicada en un iframe junto al editor, con recarga manual.
 * Útil donde el "contenido" son ítems que se guardan al instante (crear,
 * reordenar, mostrar/ocultar) y la edición de campos vive en el editor [id].
 */
export function PreviewPanel({
  path,
  children,
}: {
  path: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const iframeSrc = `${path}${path.includes("?") ? "&" : "?"}_=${reloadKey}`;

  return (
    <div className="flex flex-col">
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 border-b border-white/5 bg-[var(--bg)]/95 px-1 py-2 backdrop-blur">
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-[12px] font-medium transition-colors ${
            active
              ? "border-orange/50 bg-orange/15 text-orange"
              : "border-white/10 bg-white/[0.04] text-white/80 hover:bg-white/[0.07]"
          }`}
          aria-pressed={active}
        >
          <span
            className={`inline-block h-1.5 w-1.5 rounded-full ${
              active ? "bg-orange" : "bg-white/40"
            }`}
          />
          {active ? "Vista previa activa" : "Activar vista previa"}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="rounded border border-white/10 px-2 py-1 text-[11px] text-white/55 hover:bg-white/[0.06]"
          >
            Recargar
          </button>
        )}
      </div>

      <div className={active ? "grid grid-cols-1 gap-6 lg:grid-cols-2" : "block"}>
        <div className={active ? "min-w-0" : ""}>{children}</div>
        {active && (
          <div className="min-w-0">
            <div className="sticky top-16">
              <div
                className="overflow-hidden rounded-2xl border border-white/10 bg-black"
                style={{ height: "calc(100vh - 110px)" }}
              >
                <iframe
                  src={iframeSrc}
                  title="Vista previa"
                  className="h-full w-full"
                />
              </div>
              <div className="mt-2 text-[11px] text-white/45">
                Muestra la página pública. Recarga tras crear, reordenar o
                guardar un ítem.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
