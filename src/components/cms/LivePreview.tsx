"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PreviewModel } from "@/lib/preview";

type Status = "idle" | "saving" | "saved" | "error";

type Props = {
  model: PreviewModel;
  recordId: string;
  /** Public route to render in the iframe. Should NOT include `?preview=1` — added automatically. */
  previewPath: string;
  children: React.ReactNode;
};

export function LivePreview({
  model,
  recordId,
  previewPath,
  children,
}: Props) {
  const [active, setActive] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [reloadKey, setReloadKey] = useState(0);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const form = wrapperRef.current?.querySelector<HTMLFormElement>("form");
    formRef.current = form ?? null;
  }, []);

  const sendDraft = useCallback(async () => {
    const form = formRef.current;
    if (!form) return;
    let data: Record<string, unknown>;
    try {
      data = serializeForModel(model, new FormData(form));
    } catch {
      setStatus("error");
      return;
    }

    if (inflightRef.current) inflightRef.current.abort();
    const ctrl = new AbortController();
    inflightRef.current = ctrl;

    setStatus("saving");
    try {
      const res = await fetch("/api/cms/draft", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ model, id: recordId, data }),
        signal: ctrl.signal,
      });
      if (!res.ok) throw new Error("draft save failed");
      setStatus("saved");
      setReloadKey((k) => k + 1);
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setStatus("error");
    }
  }, [model, recordId]);

  const scheduleSave = useCallback(() => {
    if (!active) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void sendDraft();
    }, 600);
  }, [active, sendDraft]);

  useEffect(() => {
    if (!active) return;
    const form = formRef.current;
    if (!form) return;
    const onAny = () => scheduleSave();
    form.addEventListener("input", onAny);
    form.addEventListener("change", onAny);
    return () => {
      form.removeEventListener("input", onAny);
      form.removeEventListener("change", onAny);
    };
  }, [active, scheduleSave]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (active) void sendDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  const iframeSrc = `${previewPath}${previewPath.includes("?") ? "&" : "?"}preview=1&_=${reloadKey}`;

  return (
    <div ref={wrapperRef} className="flex flex-col">
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
          <div className="flex items-center gap-3 text-[11px] text-white/50">
            <StatusDot status={status} />
            <span>{statusLabel(status)}</span>
          </div>
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
                  ref={iframeRef}
                  src={iframeSrc}
                  title="Vista previa"
                  className="h-full w-full"
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
                <span>Modo borrador — sólo visible para ti</span>
                <button
                  type="button"
                  onClick={() => setReloadKey((k) => k + 1)}
                  className="rounded border border-white/10 px-2 py-1 hover:bg-white/[0.06]"
                >
                  Recargar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }: { status: Status }) {
  const color =
    status === "saving"
      ? "bg-yellow-400"
      : status === "saved"
        ? "bg-green-400"
        : status === "error"
          ? "bg-red-400"
          : "bg-white/30";
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${color}`} />;
}

function statusLabel(status: Status): string {
  switch (status) {
    case "saving":
      return "Guardando borrador…";
    case "saved":
      return "Borrador actualizado";
    case "error":
      return "Error al guardar borrador";
    default:
      return "Esperando cambios";
  }
}

// ─── Serializers ────────────────────────────────────────────────────
// Convierten FormData (lo que el usuario ve en el editor) al shape
// que la página pública lee con `mergeDraft`.

function serializeForModel(
  model: PreviewModel,
  form: FormData,
): Record<string, unknown> {
  switch (model) {
    case "portfolio":
      return serializePortfolio(form);
    case "blog":
      return serializeBlog(form);
    case "service":
      return serializeService(form);
    case "about":
      return serializeAbout(form);
  }
}

function str(form: FormData, key: string): string {
  const v = form.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function strOrNull(form: FormData, key: string): string | null {
  const s = str(form, key);
  return s.length > 0 ? s : null;
}

function intOrNull(form: FormData, key: string): number | null {
  const n = parseInt(str(form, key), 10);
  return Number.isFinite(n) ? n : null;
}

function jsonOrNull(form: FormData, key: string): unknown {
  const raw = str(form, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function serializePortfolio(form: FormData): Record<string, unknown> {
  const tagsRaw = str(form, "tags");
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return {
    title: str(form, "title"),
    slug: str(form, "slug"),
    client: strOrNull(form, "client"),
    category: str(form, "category") || "COMERCIAL",
    year: intOrNull(form, "year") ?? new Date().getFullYear(),
    excerpt: strOrNull(form, "excerpt"),
    brief: strOrNull(form, "brief"),
    process: strOrNull(form, "process"),
    result: strOrNull(form, "result"),
    coverImageUrl: strOrNull(form, "coverImageUrl"),
    videoUrl: strOrNull(form, "videoUrl"),
    galleryImages: jsonOrNull(form, "galleryImages"),
    beforeAfter: jsonOrNull(form, "beforeAfter"),
    credits: jsonOrNull(form, "credits"),
    tags,
    featured: form.get("featured") === "on",
  };
}

function serializeBlog(form: FormData): Record<string, unknown> {
  const tagsRaw = str(form, "tags");
  const tags = tagsRaw
    ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
    : [];
  return {
    title: str(form, "title"),
    slug: str(form, "slug"),
    excerpt: strOrNull(form, "excerpt"),
    content: str(form, "content"),
    coverImageUrl: strOrNull(form, "coverImageUrl"),
    authorName: strOrNull(form, "authorName"),
    authorRole: strOrNull(form, "authorRole"),
    category: strOrNull(form, "category"),
    tags,
    readMinutes: intOrNull(form, "readMinutes"),
  };
}

function serializeService(form: FormData): Record<string, unknown> {
  return {
    title: str(form, "title"),
    slug: str(form, "slug"),
    summary: strOrNull(form, "summary"),
    content: strOrNull(form, "content"),
    longDescription: strOrNull(form, "longDescription"),
    heroImageUrl: strOrNull(form, "heroImageUrl"),
    capabilities: jsonOrNull(form, "capabilities"),
    process: jsonOrNull(form, "process"),
    pricing: strOrNull(form, "pricing"),
  };
}

function serializeAbout(form: FormData): Record<string, unknown> {
  return {
    heroEyebrow: strOrNull(form, "heroEyebrow"),
    heroTitle: strOrNull(form, "heroTitle"),
    heroSubtitle: strOrNull(form, "heroSubtitle"),
    story: strOrNull(form, "story"),
    mission: strOrNull(form, "mission"),
    vision: strOrNull(form, "vision"),
    values: jsonOrNull(form, "values"),
  };
}
