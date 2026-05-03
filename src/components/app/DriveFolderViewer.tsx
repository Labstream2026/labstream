"use client";

import { useEffect, useMemo, useState } from "react";
import {
  driveImageThumbnailUrl,
  driveImageFullUrl,
  driveFilePreviewIframeUrl,
  driveFolderEmbedIframeUrl,
} from "@/lib/google-drive";
import type { DriveFile } from "@/lib/google-drive";

type Props = {
  versionId: string;
  folderId: string;
};

type ApiResponse = {
  ok: boolean;
  error?: string;
  files?: DriveFile[];
  fetchedAt?: string;
  source?: "api-key" | "service-account" | "embed-fallback";
  classifyAs?: string;
};

export function DriveFolderViewer({ versionId, folderId }: Props) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  const load = async () => {
    setRefreshing(true);
    try {
      const r = await fetch(`/api/drive/folder?versionId=${versionId}`);
      const j = (await r.json()) as ApiResponse;
      setData(j);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versionId]);

  const files = data?.files ?? [];
  const images = useMemo(() => files.filter((f) => f.isImage), [files]);
  const videos = useMemo(() => files.filter((f) => f.isVideo), [files]);
  const others = useMemo(
    () => files.filter((f) => !f.isImage && !f.isVideo),
    [files],
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(images.map((f) => f.id)));
  const selectNone = () => setSelected(new Set());

  const downloadSelected = async () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setDownloading(true);
    setDownloadProgress(0);

    try {
      // Si es solo 1, descarga directa
      if (ids.length === 1) {
        const file = images.find((f) => f.id === ids[0]);
        if (file) {
          window.open(file.downloadUrl, "_blank");
        }
        setDownloading(false);
        return;
      }

      // Múltiples: empaquetar en ZIP del lado cliente
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();

      let done = 0;
      for (const id of ids) {
        const file = images.find((f) => f.id === id);
        if (!file) continue;
        try {
          const fullUrl = driveImageFullUrl(file.id, 2400);
          const res = await fetch(fullUrl, { mode: "cors" });
          const blob = await res.blob();
          const safeName = file.name.replace(/[^\w.-]+/g, "_");
          zip.file(safeName, blob);
        } catch (e) {
          console.warn("Download failed for", file.name, e);
        }
        done += 1;
        setDownloadProgress(Math.round((done / ids.length) * 100));
      }

      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fotos-${new Date().toISOString().slice(0, 10)}.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("ZIP download failed:", e);
      alert("No se pudo descargar el ZIP. Intenta de nuevo o descarga uno por uno.");
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  };

  // Modo fallback: sin credenciales, mostramos iframe embed
  if (!loading && data && data.source === "embed-fallback") {
    return (
      <div className="lg flex flex-col gap-3 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[12px] font-semibold uppercase tracking-wider text-orange">
              📁 Carpeta de Google Drive
            </div>
            <p className="text-[11px] text-white/45">
              Vista embebida (configura{" "}
              <code className="text-orange/80">GOOGLE_DRIVE_API_KEY</code> para
              activar visor avanzado con descarga selectiva)
            </p>
          </div>
        </div>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <iframe
            src={driveFolderEmbedIframeUrl(folderId)}
            className="h-[600px] w-full bg-black"
            title="Drive folder"
          />
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lg rounded-2xl p-8 text-center text-[13px] text-white/55">
        Cargando contenido de Drive…
      </div>
    );
  }

  if (data && !data.ok) {
    return (
      <div className="lg rounded-2xl p-6 text-center text-[13px] text-red-300">
        Error: {data.error}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="lg flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
        <div className="min-w-0">
          <div className="text-[12px] font-semibold uppercase tracking-wider text-orange">
            📁 Carpeta de Google Drive
          </div>
          <div className="mt-1 text-[13px] text-white/65">
            {files.length} {files.length === 1 ? "archivo" : "archivos"}
            {images.length > 0 && ` · ${images.length} foto${images.length === 1 ? "" : "s"}`}
            {videos.length > 0 && ` · ${videos.length} video${videos.length === 1 ? "" : "s"}`}
            {others.length > 0 && ` · ${others.length} otro${others.length === 1 ? "" : "s"}`}
          </div>
          {data?.fetchedAt && (
            <div className="text-[11px] text-white/40">
              Actualizado: {new Date(data.fetchedAt).toLocaleString("es-CO")}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={refreshing}
          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/10 disabled:opacity-50"
        >
          {refreshing ? "Refrescando…" : "↻ Refrescar"}
        </button>
      </div>

      {/* Selector + descargar (solo si hay imágenes) */}
      {images.length > 0 && (
        <div className="lg flex flex-wrap items-center justify-between gap-3 rounded-2xl p-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/80 hover:bg-white/5"
            >
              Seleccionar todas
            </button>
            <button
              type="button"
              onClick={selectNone}
              className="rounded-md border border-white/10 px-2.5 py-1 text-[11px] text-white/60 hover:bg-white/5"
            >
              Ninguna
            </button>
            <span className="text-[12px] text-white/55">
              {selected.size} de {images.length} seleccionadas
            </span>
          </div>
          <button
            type="button"
            onClick={downloadSelected}
            disabled={selected.size === 0 || downloading}
            className="rounded-full bg-orange px-4 py-2 text-[13px] font-semibold text-white hover:bg-orange/80 disabled:opacity-50"
          >
            {downloading
              ? `Descargando… ${downloadProgress}%`
              : `↓ Descargar ${selected.size === 1 ? "1 foto" : `${selected.size} fotos`}`}
          </button>
        </div>
      )}

      {/* Galería de imágenes */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {images.map((f, i) => {
            const isSelected = selected.has(f.id);
            return (
              <div
                key={f.id}
                className={`group relative overflow-hidden rounded-xl border transition-all ${
                  isSelected
                    ? "border-orange ring-2 ring-orange/40"
                    : "border-white/10 hover:border-white/30"
                }`}
              >
                <button
                  type="button"
                  onClick={() => setLightboxIndex(i)}
                  className="block aspect-square w-full bg-black/40"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={driveImageThumbnailUrl(f.id, 400)}
                    alt={f.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
                <button
                  type="button"
                  onClick={() => toggleSelect(f.id)}
                  className={`absolute left-2 top-2 flex h-7 w-7 items-center justify-center rounded-md text-[14px] font-bold transition-all ${
                    isSelected
                      ? "bg-orange text-white"
                      : "bg-black/60 text-white/70 opacity-0 group-hover:opacity-100"
                  }`}
                  aria-label="Seleccionar"
                >
                  {isSelected ? "✓" : "○"}
                </button>
                <div className="bg-black/70 px-2 py-1 text-[10px] text-white/70">
                  {f.name}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lista de videos */}
      {videos.length > 0 && (
        <div className="flex flex-col gap-3">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-white/55">
            Videos
          </h4>
          {videos.map((f) => (
            <div key={f.id} className="lg overflow-hidden rounded-2xl">
              <div className="flex items-center justify-between gap-3 px-4 py-2">
                <div className="min-w-0">
                  <div className="truncate text-[14px] font-medium text-white">
                    {f.name}
                  </div>
                  <div className="text-[11px] text-white/45">
                    {f.modifiedTime &&
                      new Date(f.modifiedTime).toLocaleString("es-CO")}
                    {f.size && ` · ${(f.size / 1024 / 1024).toFixed(1)} MB`}
                  </div>
                </div>
                <a
                  href={f.downloadUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/10"
                >
                  ↓ Descargar
                </a>
              </div>
              <iframe
                src={driveFilePreviewIframeUrl(f.id)}
                className="aspect-video w-full bg-black"
                allow="autoplay"
                title={f.name}
              />
            </div>
          ))}
        </div>
      )}

      {/* Otros archivos (PDFs, etc.) */}
      {others.length > 0 && (
        <div className="lg rounded-2xl p-4">
          <h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wider text-white/55">
            Otros archivos
          </h4>
          <ul className="flex flex-col gap-1.5">
            {others.map((f) => (
              <li
                key={f.id}
                className="flex items-center justify-between rounded-md border border-white/5 px-3 py-2 text-[13px]"
              >
                <span className="truncate text-white/85">{f.name}</span>
                <a
                  href={f.viewUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[12px] text-orange hover:underline"
                >
                  Abrir ↗
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {files.length === 0 && (
        <div className="lg rounded-2xl p-8 text-center text-[13px] text-white/55">
          La carpeta está vacía o no es accesible.
        </div>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && images[lightboxIndex] && (
        <Lightbox
          images={images}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onNav={(i) => setLightboxIndex(i)}
          isSelected={selected.has(images[lightboxIndex].id)}
          onToggleSelect={() => toggleSelect(images[lightboxIndex].id)}
        />
      )}
    </div>
  );
}

function Lightbox({
  images,
  index,
  onClose,
  onNav,
  isSelected,
  onToggleSelect,
}: {
  images: DriveFile[];
  index: number;
  onClose: () => void;
  onNav: (i: number) => void;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const file = images[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && index > 0) onNav(index - 1);
      if (e.key === "ArrowRight" && index < images.length - 1) onNav(index + 1);
      if (e.key === " ") {
        e.preventDefault();
        onToggleSelect();
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [index, images.length, onClose, onNav, onToggleSelect]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      style={{ background: "rgba(0,0,0,0.95)" }}
      onClick={onClose}
    >
      <div
        className="flex items-center justify-between border-b border-white/10 px-5 py-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="min-w-0">
          <div className="truncate text-[14px] font-medium text-white">
            {file.name}
          </div>
          <div className="text-[11px] text-white/45">
            {index + 1} de {images.length}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleSelect}
            className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
              isSelected
                ? "bg-orange text-white"
                : "border border-white/10 text-white/80 hover:bg-white/5"
            }`}
          >
            {isSelected ? "✓ Seleccionada" : "○ Seleccionar"}
          </button>
          <a
            href={file.downloadUrl}
            target="_blank"
            rel="noreferrer"
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            ↓ Descargar
          </a>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-[12px] text-white/80 hover:bg-white/10"
          >
            ✕ Cerrar
          </button>
        </div>
      </div>
      <div
        className="relative flex-1 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={driveImageFullUrl(file.id, 2400)}
          alt={file.name}
          className="absolute inset-0 m-auto max-h-full max-w-full object-contain"
          referrerPolicy="no-referrer"
        />
        {index > 0 && (
          <button
            type="button"
            onClick={() => onNav(index - 1)}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-[18px] text-white hover:bg-white/20"
            aria-label="Anterior"
          >
            ‹
          </button>
        )}
        {index < images.length - 1 && (
          <button
            type="button"
            onClick={() => onNav(index + 1)}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-4 py-3 text-[18px] text-white hover:bg-white/20"
            aria-label="Siguiente"
          >
            ›
          </button>
        )}
      </div>
      <div className="border-t border-white/10 px-5 py-2 text-center text-[11px] text-white/45">
        ← → para navegar · espacio para seleccionar · ESC para cerrar
      </div>
    </div>
  );
}
