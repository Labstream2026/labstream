"use client";

import { useEffect, useState } from "react";

type Asset = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  filename?: string | null;
  mimeType?: string | null;
  sizeBytes?: number | null;
  source?: "UPLOAD" | "URL";
  alt?: string | null;
  createdAt?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onPick: (asset: { url: string; alt?: string; caption?: string }) => void;
  filter?: "image" | "video" | "any";
  multi?: boolean;
  onPickMulti?: (assets: { url: string; alt?: string }[]) => void;
};

type Tab = "library" | "upload" | "url";

type ApiResp = {
  ok?: boolean;
  error?: unknown;
  asset?: { url: string; alt?: string | null };
  assets?: Asset[];
};

/** Lee la respuesta como JSON sin romper si el cuerpo viene vacío o no es JSON. */
async function safeJson(r: Response): Promise<ApiResp> {
  const text = await r.text().catch(() => "");
  if (!text) return {};
  try {
    return JSON.parse(text) as ApiResp;
  } catch {
    return {};
  }
}

/** Traduce los códigos de error del API a un mensaje claro para el usuario. */
function uploadErrorMessage(code: unknown, status: number): string {
  switch (code) {
    case "too_large":
      return "El archivo es demasiado grande (máx. 50 MB).";
    case "bad_type":
      return "Tipo de archivo no permitido (usa JPG, PNG, WebP, MP4…).";
    case "no_file":
      return "No se seleccionó ningún archivo.";
    case "forbidden":
      return "No tienes permiso para subir archivos.";
    case "storage_failed":
      return "El servidor no pudo guardar el archivo (permisos de la carpeta de subidas en el NAS).";
    case "db_failed":
      return "El archivo se subió pero no se pudo registrar. Intenta de nuevo.";
    default:
      return `No se pudo subir (error ${status || "desconocido"}).`;
  }
}

export function AssetPicker({
  open,
  onClose,
  onPick,
  filter = "any",
  multi = false,
  onPickMulti,
}: Props) {
  const [tab, setTab] = useState<Tab>("library");
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [externalAlt, setExternalAlt] = useState("");
  const [savingExternal, setSavingExternal] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    if (!open || tab !== "library") return;
    // eslint-disable-next-line react-hooks/immutability
    loadAssets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tab, search, filter]);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filter !== "any") params.set("type", filter);
      const r = await fetch(`/api/assets?${params.toString()}`);
      const j = await safeJson(r);
      setAssets(j.assets ?? []);
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("json", "1");
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const j = await safeJson(r);
      if (!r.ok || !j.ok || !j.asset) {
        setUploadError(uploadErrorMessage(j.error, r.status));
        return;
      }
      // Auto-pick
      onPick({ url: j.asset.url });
      onClose();
    } catch (e) {
      setUploadError(String(e));
    } finally {
      setUploading(false);
    }
  };

  const handleAddExternalUrl = async () => {
    if (!externalUrl.trim()) return;
    setSavingExternal(true);
    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: externalUrl, alt: externalAlt }),
      });
      const j = await safeJson(r);
      if (r.ok && j.ok && j.asset) {
        onPick({ url: j.asset.url, alt: externalAlt || undefined });
        onClose();
      } else {
        setUploadError(uploadErrorMessage(j.error, r.status));
      }
    } finally {
      setSavingExternal(false);
    }
  };

  const handleSelectAsset = (asset: Asset) => {
    if (multi && onPickMulti) {
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(asset.id)) next.delete(asset.id);
        else next.add(asset.id);
        return next;
      });
      return;
    }
    onPick({ url: asset.url, alt: asset.alt ?? undefined });
    onClose();
  };

  const confirmMultiSelection = () => {
    if (!onPickMulti) return;
    const picked = assets
      .filter((a) => selected.has(a.id))
      .map((a) => ({ url: a.url, alt: a.alt ?? undefined }));
    onPickMulti(picked);
    setSelected(new Set());
    onClose();
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.7)" }}
      onClick={onClose}
    >
      <div
        className="lg flex h-[80vh] w-full max-w-5xl flex-col rounded-2xl"
        style={{ background: "var(--bg-2)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between border-b px-5 py-3"
          style={{ borderColor: "var(--border)" }}
        >
          <h2 className="text-[16px] font-semibold text-white">
            Elegir medio{multi && " (puedes seleccionar varios)"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 px-2.5 py-1 text-[12px] text-white/65 hover:bg-white/5"
          >
            ✕
          </button>
        </div>

        <div className="flex gap-1 border-b px-5" style={{ borderColor: "var(--border)" }}>
          <TabBtn active={tab === "library"} onClick={() => setTab("library")}>
            📚 Biblioteca
          </TabBtn>
          <TabBtn active={tab === "upload"} onClick={() => setTab("upload")}>
            ⬆ Subir nuevo
          </TabBtn>
          <TabBtn active={tab === "url"} onClick={() => setTab("url")}>
            🔗 URL externa
          </TabBtn>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === "library" && (
            <>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nombre o alt…"
                className="mb-4 w-full rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2 text-[13px] text-white"
              />
              {loading ? (
                <div className="text-center text-[13px] text-white/55">
                  Cargando…
                </div>
              ) : assets.length === 0 ? (
                <div className="text-center text-[13px] text-white/55">
                  No hay medios todavía. Sube uno o agrega por URL.
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                    {assets.map((a) => {
                      const isSelected = selected.has(a.id);
                      const isImage =
                        a.mimeType?.startsWith("image/") ||
                        /\.(jpe?g|png|gif|webp|avif|svg)(\?|$)/i.test(a.url);
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => handleSelectAsset(a)}
                          className={`group relative overflow-hidden rounded-xl border text-left transition-all ${
                            isSelected
                              ? "border-orange ring-2 ring-orange/40"
                              : "border-white/10 hover:border-white/30"
                          }`}
                        >
                          <div className="aspect-square w-full bg-black/40">
                            {isImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img
                                src={a.thumbnailUrl ?? a.url}
                                alt={a.alt ?? ""}
                                className="h-full w-full object-cover"
                                loading="lazy"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-[10px] uppercase tracking-widest text-white/40">
                                {a.mimeType ?? "URL"}
                              </div>
                            )}
                          </div>
                          {multi && (
                            <span
                              className={`absolute left-2 top-2 flex h-6 w-6 items-center justify-center rounded-md text-[12px] font-bold ${
                                isSelected
                                  ? "bg-orange text-white"
                                  : "bg-black/60 text-white/70"
                              }`}
                            >
                              {isSelected ? "✓" : "○"}
                            </span>
                          )}
                          <div className="bg-black/70 px-2 py-1.5">
                            <div className="truncate text-[11px] font-medium text-white/90">
                              {a.filename ?? "(URL externa)"}
                            </div>
                            {a.source === "URL" && (
                              <div className="text-[9px] uppercase tracking-wider text-orange/80">
                                URL
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {multi && selected.size > 0 && (
                    <div className="mt-4 flex justify-end">
                      <button
                        type="button"
                        onClick={confirmMultiSelection}
                        className="btn-primary"
                      >
                        Insertar {selected.size}{" "}
                        {selected.size === 1 ? "medio" : "medios"}
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {tab === "upload" && (
            <UploadTab
              uploading={uploading}
              error={uploadError}
              onUpload={handleUpload}
            />
          )}

          {tab === "url" && (
            <div className="mx-auto flex max-w-md flex-col gap-3">
              <p className="text-[13px] text-white/65">
                Pega una URL pública: Drive, Vimeo, YouTube, S3, Unsplash…
              </p>
              <input
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://…"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
              />
              <input
                value={externalAlt}
                onChange={(e) => setExternalAlt(e.target.value)}
                placeholder="Texto alternativo (opcional)"
                className="rounded-lg border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white"
              />
              <button
                type="button"
                onClick={handleAddExternalUrl}
                disabled={!externalUrl.trim() || savingExternal}
                className="btn-primary self-start disabled:opacity-50"
              >
                {savingExternal ? "Guardando…" : "Agregar e insertar"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative px-4 py-3 text-[13px] font-medium transition-colors ${
        active ? "text-white" : "text-white/55 hover:text-white"
      }`}
    >
      {children}
      {active && (
        <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange" />
      )}
    </button>
  );
}

function UploadTab({
  uploading,
  error,
  onUpload,
}: {
  uploading: boolean;
  error: string | null;
  onUpload: (f: File) => void;
}) {
  const [drag, setDrag] = useState(false);

  return (
    <div className="mx-auto flex max-w-md flex-col gap-3">
      <label
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-12 text-center transition-colors ${
          drag
            ? "border-orange bg-orange/5"
            : "border-white/15 bg-white/[0.02] hover:bg-white/[0.04]"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          if (f) onUpload(f);
        }}
      >
        <div className="mb-3 text-3xl">📁</div>
        <div className="text-[14px] font-medium text-white">
          Arrastra un archivo aquí
        </div>
        <div className="mt-1 text-[12px] text-white/55">
          o haz click para seleccionar
        </div>
        <input
          type="file"
          accept="image/*,video/*,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onUpload(f);
          }}
        />
      </label>
      {uploading && (
        <p className="text-center text-[13px] text-orange">Subiendo…</p>
      )}
      {error && (
        <p className="text-center text-[13px] text-red-300">Error: {error}</p>
      )}
    </div>
  );
}
