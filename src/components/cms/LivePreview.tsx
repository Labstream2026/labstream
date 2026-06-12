"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  PreviewModel,
  CollectionSurface,
  ConfigSurface,
} from "@/lib/preview";

type Status = "idle" | "saving" | "saved" | "error";

/** "record": un solo form (el actual). "collection": varios forms-ítem que
 *  se agregan en un array. "config": un solo form de config global. */
type Mode = "record" | "collection" | "config";

type Props = {
  model: PreviewModel | CollectionSurface | ConfigSurface;
  /** Sólo necesario en modo "record". Para colección/config se ignora. */
  recordId?: string;
  mode?: Mode;
  /** Public route to render in the iframe. Should NOT include `?preview=1` — added automatically. */
  previewPath: string;
  children: React.ReactNode;
};

export function LivePreview({
  model,
  recordId = "singleton",
  mode = "record",
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
    let data: Record<string, unknown>;
    try {
      if (mode === "collection") {
        const wrapper = wrapperRef.current;
        if (!wrapper) return;
        data = serializeCollection(wrapper);
      } else {
        const form = formRef.current;
        if (!form) return;
        const fd = new FormData(form);
        data =
          mode === "config"
            ? serializeConfig(model as ConfigSurface, fd)
            : serializeForModel(model as PreviewModel, fd);
      }
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
  }, [model, recordId, mode]);

  const scheduleSave = useCallback(() => {
    if (!active) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void sendDraft();
    }, 600);
  }, [active, sendDraft]);

  useEffect(() => {
    if (!active) return;
    // En modo colección escuchamos en el wrapper (varios forms-ítem); en
    // record/config basta el form único.
    const target: HTMLElement | null =
      mode === "collection" ? wrapperRef.current : formRef.current;
    if (!target) return;
    const onAny = () => scheduleSave();
    target.addEventListener("input", onAny);
    target.addEventListener("change", onAny);
    return () => {
      target.removeEventListener("input", onAny);
      target.removeEventListener("change", onAny);
    };
  }, [active, scheduleSave, mode]);

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
    case "home":
      return serializeHome(form);
  }
}

// ─── Colecciones ────────────────────────────────────────────────────
// Recoge TODOS los forms-ítem (los que llevan un hidden `id` no vacío) dentro
// del editor y los serializa a un array genérico. Los nombres de los inputs
// coinciden con las columnas que lee la página pública.

function serializeCollection(wrapper: HTMLElement): Record<string, unknown> {
  const forms = Array.from(wrapper.querySelectorAll("form"));
  const items: Record<string, unknown>[] = [];
  for (const form of forms) {
    const fd = new FormData(form);
    const id = fd.get("id");
    // Saltamos el form de "crear" (sin id) y el de reordenar.
    if (typeof id !== "string" || !id.trim()) continue;
    items.push(serializeGenericForm(fd));
  }
  return { items };
}

/** FormData → objeto: checkboxes ("on") → true, enteros → number, resto string. */
function serializeGenericForm(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of fd.entries()) {
    if (typeof v !== "string") continue; // ignora File
    if (v === "on") {
      obj[k] = true;
      continue;
    }
    const t = v.trim();
    if (t !== "" && /^-?\d+$/.test(t)) {
      obj[k] = Number(t);
      continue;
    }
    obj[k] = v;
  }
  return obj;
}

// ─── Config global (apariencia + ajustes) ───────────────────────────

function serializeConfig(
  model: ConfigSurface,
  form: FormData,
): Record<string, unknown> {
  if (model === "appearance") {
    return {
      fontHeading: strOrNull(form, "fontHeading"),
      fontBody: strOrNull(form, "fontBody"),
      colorPrimary: strOrNull(form, "colorPrimary"),
      colorAccent: strOrNull(form, "colorAccent"),
      colorBg: strOrNull(form, "colorBg"),
      colorText: strOrNull(form, "colorText"),
      logoUrl: strOrNull(form, "logoUrl"),
      faviconUrl: strOrNull(form, "faviconUrl"),
    };
  }
  // settings
  return {
    siteName: strOrNull(form, "siteName"),
    tagline: strOrNull(form, "tagline"),
    contactEmail: strOrNull(form, "contactEmail"),
    socials: {
      instagram: strOrNull(form, "instagram"),
      vimeo: strOrNull(form, "vimeo"),
      youtube: strOrNull(form, "youtube"),
      linkedin: strOrNull(form, "linkedin"),
    },
  };
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

function serializeHome(form: FormData): Record<string, unknown> {
  return {
    heroBadgeTag: strOrNull(form, "heroBadgeTag"),
    heroBadgeText: strOrNull(form, "heroBadgeText"),
    heroTitle: strOrNull(form, "heroTitle"),
    heroSubtitle: strOrNull(form, "heroSubtitle"),
    heroCtaPrimaryLabel: strOrNull(form, "heroCtaPrimaryLabel"),
    heroCtaPrimaryHref: strOrNull(form, "heroCtaPrimaryHref"),
    heroCtaSecondaryLabel: strOrNull(form, "heroCtaSecondaryLabel"),
    heroCtaSecondaryHref: strOrNull(form, "heroCtaSecondaryHref"),
    heroBackgroundImage: strOrNull(form, "heroBackgroundImage"),
    heroBackgroundVideo: strOrNull(form, "heroBackgroundVideo"),
    stats: jsonOrNull(form, "stats"),
    processEyebrow: strOrNull(form, "processEyebrow"),
    processTitle: strOrNull(form, "processTitle"),
    processSteps: jsonOrNull(form, "processSteps"),
    ctaEyebrow: strOrNull(form, "ctaEyebrow"),
    ctaTitle: strOrNull(form, "ctaTitle"),
    ctaSubtitle: strOrNull(form, "ctaSubtitle"),
    ctaPrimaryLabel: strOrNull(form, "ctaPrimaryLabel"),
    ctaPrimaryHref: strOrNull(form, "ctaPrimaryHref"),
    ctaSecondaryLabel: strOrNull(form, "ctaSecondaryLabel"),
    ctaSecondaryHref: strOrNull(form, "ctaSecondaryHref"),
  };
}
