"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  AnnotationCanvas,
  paintAnnotationsToCanvas,
  type Tool,
} from "./AnnotationCanvas";
import { GuestWelcome } from "./GuestWelcome";
import { CreateAccountPrompt } from "./CreateAccountPrompt";
import type { Annotation } from "@/lib/review";

const GUEST_COOKIE = "lab_guest";
const SIGNUP_DISMISSED_COOKIE = "lab_guest_signup_dismissed";

function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return;
  const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${exp}; path=/; SameSite=Lax`;
}
function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]+)"));
  return m ? decodeURIComponent(m[1]) : null;
}

export type ReviewComment = {
  id: string;
  body: string;
  videoTimeMs: number | null;
  createdAt: string;
  parentId: string | null;
  resolved: boolean;
  isGuest: boolean;
  displayName: string;
  annotations: Annotation[] | null;
  frame: { id: string; url: string } | null;
  replies?: ReviewComment[];
};

export type PlayerSrc =
  | { kind: "video"; src: string; poster?: string }
  | { kind: "iframe"; src: string }
  | { kind: "image"; src: string }
  | { kind: "unsupported"; url: string };

type Props = {
  slug: string;
  title: string;
  message: string | null;
  player: PlayerSrc;
  initialComments: ReviewComment[];
  guestName: string | null;
  guestEmail: string | null;
  isLoggedIn: boolean;
  loggedInName: string | null;
  allowGuests: boolean;
  allowDrawings: boolean;
  requireGuestEmail: boolean;
  canResolve: boolean; // solo equipo logueado
};

const COLORS = ["#E8640C", "#FF3B30", "#FFD60A", "#34C759", "#5AC8FA", "#FFFFFF"];

export function ReviewPlayer(props: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [aspect, setAspect] = useState<{ w: number; h: number } | null>(null);
  const [currentMs, setCurrentMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [containerSize, setContainerSize] = useState({ w: 800, h: 450 });
  // Empezamos asumiendo que el server soporta CORS. Si carga falla, lo bajamos.
  const [useCors, setUseCors] = useState(true);
  const [canCaptureFrame, setCanCaptureFrame] = useState(true);

  // ── Embeds (Vimeo/YouTube/Drive): seguimiento del segundo actual ──
  const iframeElRef = useRef<HTMLIFrameElement>(null);
  const embedProvider: "vimeo" | "youtube" | "other" | null =
    props.player.kind === "iframe"
      ? props.player.src.includes("vimeo.com")
        ? "vimeo"
        : props.player.src.includes("youtube")
          ? "youtube"
          : "other"
      : null;
  // Tiempo leído del embed (si su API responde) y tiempo manual (para Drive,
  // que no expone API). Ambos en ms.
  const [embedTimeMs, setEmbedTimeMs] = useState<number | null>(null);
  const [manualTime, setManualTime] = useState(""); // formato "M:SS" o segundos

  // Tool state
  const [tool, setTool] = useState<Tool>("select");
  const [color, setColor] = useState<string>("#E8640C");
  const [drawingActive, setDrawingActive] = useState(false);
  const [pendingAnnotations, setPendingAnnotations] = useState<Annotation[]>([]);
  // Bumped cuando queremos resetear el canvas (al limpiar / cancelar / publicar)
  const [canvasKey, setCanvasKey] = useState(0);

  // Composer state
  const [composerOpen, setComposerOpen] = useState(false);
  const [body, setBody] = useState("");
  const [guestName, setGuestName] = useState(props.guestName ?? "");
  const [guestEmail, setGuestEmail] = useState(props.guestEmail ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  // Welcome gate: si es invitado y no tenemos su nombre, lo bloqueamos al inicio
  const [welcomeDone, setWelcomeDone] = useState(
    props.isLoggedIn || (props.guestName != null && props.guestName.length > 0),
  );
  // Banner de "crear cuenta" — se muestra una vez que el invitado publica
  // su primer comentario, y solo si no lo descartó antes.
  const [signupVisible, setSignupVisible] = useState(false);
  const [signupDismissedLocal, setSignupDismissedLocal] = useState(false);
  // Lee la cookie una vez al montar; useSyncExternalStore evita setState-in-effect.
  const dismissedFromCookie = useSyncExternalStore(
    () => () => {},
    () => readCookie(SIGNUP_DISMISSED_COOKIE) === "1",
    () => false,
  );
  const signupDismissed = signupDismissedLocal || dismissedFromCookie;

  // Guest persistence — cookie GLOBAL (no por slug). Se reconoce en cualquier
  // /review/[slug] futuro automáticamente.
  useEffect(() => {
    if (props.isLoggedIn) return;
    if (guestName.trim() || guestEmail.trim()) {
      setCookie(
        GUEST_COOKIE,
        JSON.stringify({ name: guestName.trim(), email: guestEmail.trim() }),
      );
    }
  }, [guestName, guestEmail, props.isLoggedIn]);

  // Comments state (local, mutated on submit)
  const [comments, setComments] = useState<ReviewComment[]>(props.initialComments);
  const [resolving, setResolving] = useState<string | null>(null);

  // Group comments — root comments + replies
  const rootComments = useMemo(() => {
    const byParent = new Map<string, ReviewComment[]>();
    const roots: ReviewComment[] = [];
    for (const c of comments) {
      if (c.parentId) {
        if (!byParent.has(c.parentId)) byParent.set(c.parentId, []);
        byParent.get(c.parentId)!.push(c);
      } else {
        roots.push(c);
      }
    }
    return roots
      .sort((a, b) => (a.videoTimeMs ?? 0) - (b.videoTimeMs ?? 0))
      .map((r) => ({ ...r, replies: byParent.get(r.id) ?? [] }));
  }, [comments]);

  // Detect aspect ratio + container size
  useEffect(() => {
    function measure() {
      if (containerRef.current) {
        const r = containerRef.current.getBoundingClientRect();
        setContainerSize({ w: Math.round(r.width), h: Math.round(r.height) });
      }
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, [aspect]);

  // Video event hookup
  useEffect(() => {
    const v = videoRef.current;
    if (!v || props.player.kind !== "video") return;

    const onLoaded = () => {
      setAspect({ w: v.videoWidth, h: v.videoHeight });
      setDurationMs(Math.round(v.duration * 1000));
    };
    const onTime = () => setCurrentMs(Math.round(v.currentTime * 1000));
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      // Si falla con CORS, reintentar sin CORS (perdemos frame capture)
      if (useCors) {
        console.warn("[review] video load error with CORS — retrying without");
        setUseCors(false);
        setCanCaptureFrame(false);
      }
    };

    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("error", onError);
    };
  }, [props.player.kind, useCors]);

  // Embed time tracking (Vimeo / YouTube) vía postMessage.
  useEffect(() => {
    if (props.player.kind !== "iframe") return;
    if (embedProvider !== "vimeo" && embedProvider !== "youtube") return;

    function onMsg(e: MessageEvent) {
      try {
        const data =
          typeof e.data === "string" ? JSON.parse(e.data) : e.data;
        if (!data || typeof data !== "object") return;
        if (embedProvider === "vimeo") {
          if (data.event === "playProgress" || data.method === "getCurrentTime") {
            const sec = data.data?.seconds ?? data.value;
            if (typeof sec === "number") setEmbedTimeMs(Math.round(sec * 1000));
          }
          if (data.event === "play") setPlaying(true);
          if (data.event === "pause" || data.event === "finish") setPlaying(false);
        } else if (embedProvider === "youtube") {
          // La IFrame API manda "infoDelivery" con info.currentTime y playerState.
          if (data.event === "infoDelivery" && data.info) {
            if (typeof data.info.currentTime === "number")
              setEmbedTimeMs(Math.round(data.info.currentTime * 1000));
            if (typeof data.info.playerState === "number")
              setPlaying(data.info.playerState === 1);
          }
        }
      } catch {
        /* mensajes no-JSON de otros orígenes: ignorar */
      }
    }
    window.addEventListener("message", onMsg);

    // Handshake: hay que (re)suscribirse periódicamente porque el iframe puede
    // cargar después de montar.
    const post = () => {
      const win = iframeElRef.current?.contentWindow;
      if (!win) return;
      if (embedProvider === "vimeo") {
        for (const ev of ["playProgress", "play", "pause", "finish"]) {
          win.postMessage(
            JSON.stringify({ method: "addEventListener", value: ev }),
            "*",
          );
        }
      } else {
        win.postMessage(JSON.stringify({ event: "listening", id: 1 }), "*");
      }
    };
    post();
    const t = setInterval(post, 1200);
    return () => {
      window.removeEventListener("message", onMsg);
      clearInterval(t);
    };
  }, [props.player.kind, embedProvider]);

  // Tiempo efectivo para comentar: video nativo → currentMs; embed → el tiempo
  // leído de su API, o el que el usuario escribió a mano (Drive).
  const manualMs = parseTimecode(manualTime);
  // El tiempo escrito a mano tiene prioridad (override); si no, el de la API.
  const effectiveTimeMs =
    props.player.kind === "video" ? currentMs : manualMs ?? embedTimeMs ?? 0;
  const hasTime =
    props.player.kind === "video"
      ? durationMs > 0
      : manualMs != null || embedTimeMs != null;

  // Aspect ratio CSS
  const aspectRatio = aspect ? `${aspect.w} / ${aspect.h}` : "16 / 9";
  const isVertical = aspect ? aspect.h > aspect.w : false;

  // Player controls
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play();
    else v.pause();
  }, []);

  const seek = useCallback((ms: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(ms / 1000, durationMs / 1000));
  }, [durationMs]);

  const stepFrame = useCallback((dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    v.pause();
    // ~ 1/30s salto
    v.currentTime = Math.max(0, v.currentTime + (dir * 1) / 30);
  }, []);

  // Capture frame snapshot from video into a hidden canvas → dataURL
  function captureFrameDataUrl(burnAnnotations: boolean): string | null {
    const v = videoRef.current;
    if (!v || props.player.kind !== "video" || !aspect) return null;
    if (!canCaptureFrame) return null;
    const canvas = document.createElement("canvas");
    canvas.width = aspect.w;
    canvas.height = aspect.h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    try {
      ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
      if (burnAnnotations && pendingAnnotations.length > 0) {
        paintAnnotationsToCanvas(ctx, pendingAnnotations, canvas.width, canvas.height);
      }
      return canvas.toDataURL("image/jpeg", 0.85);
    } catch (e) {
      // CORS — el video no devolvió headers correctos. Marcamos el flag.
      console.warn("[review] captureFrame failed (canvas tainted)", e);
      setCanCaptureFrame(false);
      return null;
    }
  }

  function startDrawing() {
    const v = videoRef.current;
    if (v) v.pause();
    setDrawingActive(true);
    setTool("rect");
    setComposerOpen(true);
  }

  async function submit() {
    setSubmitting(true);
    setErrorMsg(null);
    try {
      // 1. Si hay anotaciones + video accesible: capturar frame y subirlo
      let frameAssetId: string | undefined;
      if (drawingActive && props.player.kind === "video") {
        const dataUrl = captureFrameDataUrl(true);
        if (dataUrl) {
          const r = await fetch(`/api/review/${props.slug}/frame`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ dataUrl }),
          });
          if (r.ok) {
            const j = await r.json();
            frameAssetId = j.assetId;
          }
        }
      }

      // 2. Enviar comentario
      const payload: Record<string, unknown> = {
        body: body.trim(),
        videoTimeMs: hasTime ? effectiveTimeMs : undefined,
      };
      if (!props.isLoggedIn) {
        payload.guestName = guestName.trim();
        if (guestEmail.trim()) payload.guestEmail = guestEmail.trim();
      }
      if (frameAssetId) payload.frameAssetId = frameAssetId;
      if (drawingActive && pendingAnnotations.length > 0) {
        payload.annotations = pendingAnnotations;
      }

      const r = await fetch(`/api/review/${props.slug}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? "send_failed");
      }
      const j = await r.json();
      setComments((prev) => [...prev, j.comment as ReviewComment]);
      setBody("");
      setPendingAnnotations([]); setCanvasKey((k) => k + 1);
      setDrawingActive(false);
      setTool("select");
      setComposerOpen(false);
      // Si es invitado y aún no había publicado nada en esta sesión, mostramos
      // el prompt de crear cuenta (a menos que ya lo haya descartado).
      if (!props.isLoggedIn && !signupDismissed) {
        setSignupVisible(true);
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error desconocido";
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function reply(parentId: string, replyBody: string) {
    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        body: replyBody,
        parentId,
      };
      if (!props.isLoggedIn) {
        payload.guestName = guestName.trim();
        if (guestEmail.trim()) payload.guestEmail = guestEmail.trim();
      }
      const r = await fetch(`/api/review/${props.slug}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (r.ok) {
        const j = await r.json();
        setComments((prev) => [...prev, j.comment as ReviewComment]);
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleResolved(commentId: string, current: boolean) {
    setResolving(commentId);
    try {
      const r = await fetch(`/api/review/${props.slug}/comments`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ commentId, resolved: !current }),
      });
      if (r.ok) {
        setComments((prev) =>
          prev.map((c) => (c.id === commentId ? { ...c, resolved: !current } : c)),
        );
      }
    } finally {
      setResolving(null);
    }
  }

  const guestReady =
    props.isLoggedIn ||
    (guestName.trim().length > 0 &&
      (!props.requireGuestEmail || /\S+@\S+\.\S+/.test(guestEmail)));

  // ───── Welcome gate: invitado que aún no se identificó ─────
  if (!welcomeDone && props.allowGuests) {
    return (
      <GuestWelcome
        reviewTitle={props.title}
        message={props.message}
        requireEmail={props.requireGuestEmail}
        onContinue={({ name, email }) => {
          setGuestName(name);
          setGuestEmail(email);
          setCookie(GUEST_COOKIE, JSON.stringify({ name, email }));
          setWelcomeDone(true);
        }}
      />
    );
  }

  // ───── UI ─────
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      {/* Columna principal: player */}
      <div className="flex flex-col gap-3">
        <div
          ref={containerRef}
          className="relative mx-auto w-full overflow-hidden rounded-2xl bg-black"
          style={{
            aspectRatio,
            maxWidth: isVertical ? Math.min(440, containerSize.h * (aspect!.w / aspect!.h)) : "100%",
            maxHeight: isVertical ? "78vh" : "70vh",
          }}
        >
          {props.player.kind === "video" && (
            <>
              <video
                ref={videoRef}
                key={`${props.player.src}-${useCors}`}
                src={props.player.src}
                poster={props.player.poster}
                playsInline
                // Probamos con CORS primero (necesario para frame capture).
                // Si el server no devuelve los headers, el onError handler
                // baja a sin-CORS automáticamente.
                crossOrigin={useCors ? "anonymous" : undefined}
                onClick={togglePlay}
                className="block h-full w-full bg-black"
                style={{ objectFit: "contain" }}
              />
              {/* Overlay para anotaciones del comentario en composición */}
              {drawingActive && (
                <AnnotationCanvas
                  key={canvasKey}
                  width={aspect?.w ?? containerSize.w}
                  height={aspect?.h ?? containerSize.h}
                  tool={tool}
                  color={color}
                  onChange={setPendingAnnotations}
                />
              )}
            </>
          )}

          {props.player.kind === "iframe" && (
            <iframe
              ref={iframeElRef}
              src={props.player.src}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              title="Video"
            />
          )}

          {props.player.kind === "image" && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.player.src} alt="" className="h-full w-full object-contain" />
          )}

          {props.player.kind === "unsupported" && (
            <div className="flex h-full items-center justify-center text-white/60">
              Material no reproducible aquí.{" "}
              {props.player.url && (
                <a href={props.player.url} target="_blank" rel="noreferrer" className="ml-2 text-orange underline">
                  Abrir externo
                </a>
              )}
            </div>
          )}
        </div>

        {/* Player controls + timeline */}
        {props.player.kind === "video" && (
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={togglePlay}
                className="rounded-full bg-white text-black hover:bg-white/85"
                style={{ width: 38, height: 38, fontSize: 14, fontWeight: 700 }}
                aria-label={playing ? "Pausa" : "Reproducir"}
              >
                {playing ? "❚❚" : "▶"}
              </button>
              <button
                type="button"
                onClick={() => stepFrame(-1)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white hover:bg-white/10"
                title="Frame anterior"
              >
                ←⬛
              </button>
              <button
                type="button"
                onClick={() => stepFrame(1)}
                className="rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-[12px] text-white hover:bg-white/10"
                title="Frame siguiente"
              >
                ⬛→
              </button>

              <div className="ml-2 font-mono text-[12px] text-white/85">
                {fmt(currentMs)} <span className="text-white/40">/ {fmt(durationMs)}</span>
              </div>

              <div className="ml-auto flex items-center gap-2">
                {!drawingActive && (
                  <button
                    type="button"
                    onClick={startDrawing}
                    disabled={!props.allowDrawings}
                    title={!props.allowDrawings ? "Dibujos deshabilitados por el productor" : "Marcar este momento"}
                    className="rounded-full bg-orange px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-orange/85 disabled:opacity-40"
                  >
                    + Marcar momento
                  </button>
                )}
                {!drawingActive && (
                  <button
                    type="button"
                    onClick={() => {
                      const v = videoRef.current;
                      if (v) v.pause();
                      setComposerOpen(true);
                    }}
                    className="rounded-full border border-white/15 bg-white/5 px-4 py-1.5 text-[13px] font-medium text-white hover:bg-white/10"
                  >
                    Comentar sin dibujo
                  </button>
                )}
              </div>
            </div>

            {/* Timeline scrubber con marcadores */}
            <div className="relative">
              <input
                type="range"
                min={0}
                max={Math.max(1, durationMs)}
                value={currentMs}
                onChange={(e) => seek(Number(e.target.value))}
                className="block w-full cursor-pointer accent-orange"
              />
              {/* Marcadores de comentarios */}
              <div className="pointer-events-none relative h-3">
                {rootComments
                  .filter((c) => c.videoTimeMs != null && durationMs > 0)
                  .map((c) => {
                    const pct = ((c.videoTimeMs ?? 0) / durationMs) * 100;
                    return (
                      <div
                        key={c.id}
                        className="absolute top-0 -translate-x-1/2"
                        style={{ left: `${pct}%` }}
                        title={`${c.displayName} · ${fmt(c.videoTimeMs ?? 0)}: ${c.body.slice(0, 60)}`}
                      >
                        <button
                          type="button"
                          onClick={() => seek(c.videoTimeMs ?? 0)}
                          className="pointer-events-auto block rounded-full"
                          style={{
                            width: 10,
                            height: 10,
                            background: c.resolved ? "#34C759" : c.isGuest ? "#FFD60A" : "#E8640C",
                            border: "2px solid #0a0a0a",
                          }}
                        />
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Drawing toolbar (visible si drawingActive) */}
            {drawingActive && (
              <div className="flex flex-wrap items-center gap-2 border-t border-white/10 pt-2">
                <span className="text-[10px] uppercase tracking-wider text-white/45">Herramientas</span>
                {(["pen", "rect", "arrow", "text"] as Tool[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTool(t)}
                    className={`rounded-md border px-2 py-1 text-[11px] ${
                      tool === t
                        ? "border-orange/60 bg-orange/15 text-orange"
                        : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                    }`}
                  >
                    {t === "pen" ? "Lápiz" : t === "rect" ? "Rect" : t === "arrow" ? "Flecha" : "Texto"}
                  </button>
                ))}
                <div className="ml-2 flex gap-1">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`rounded-full ${color === c ? "ring-2 ring-white" : ""}`}
                      style={{ width: 20, height: 20, background: c }}
                      aria-label={`Color ${c}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setPendingAnnotations([])}
                  className="ml-auto rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
                >
                  Borrar dibujo
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDrawingActive(false);
                    setPendingAnnotations([]); setCanvasKey((k) => k + 1);
                    setTool("select");
                  }}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        )}

        {props.player.kind === "iframe" && (
          <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-white/70">Comentar en el segundo</span>
              <input
                value={manualTime}
                onChange={(e) => setManualTime(e.target.value)}
                placeholder={embedTimeMs != null ? fmtShort(embedTimeMs) : "0:34"}
                inputMode="numeric"
                className="w-24 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-center font-mono text-[13px] text-white focus:border-orange/50 focus:outline-none"
              />
              {embedTimeMs != null && (
                <button
                  type="button"
                  onClick={() => setManualTime(fmtShort(embedTimeMs))}
                  className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/75 hover:bg-white/10"
                  title="Usar el segundo actual del video"
                >
                  ⏱ {fmtShort(embedTimeMs)}
                </button>
              )}
              <button
                type="button"
                onClick={() => setComposerOpen(true)}
                className="ml-auto rounded-full bg-orange px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-orange/85"
              >
                + Comentar aquí
              </button>
            </div>
            <p className="text-[11px] text-white/45">
              {embedProvider === "vimeo" || embedProvider === "youtube"
                ? "Pausa el video y pulsa ⏱ para tomar el segundo automáticamente, o escríbelo a mano. El dibujo/captura requieren el modo “streaming” (pídeselo al productor)."
                : "Pausa el video, mira el segundo en el reproductor y escríbelo aquí. El dibujo/captura requieren el modo “streaming” — pídeselo al productor."}
            </p>
          </div>
        )}
      </div>

      {/* Sidebar: comentarios */}
      <aside className="flex max-h-[80vh] flex-col gap-3 overflow-hidden">
        <div>
          <h2 className="font-heading text-white" style={{ fontSize: 24 }}>
            {props.title}
          </h2>
          {props.message && (
            <p className="mt-1 text-[12.5px] leading-snug text-white/70">{props.message}</p>
          )}
          {!props.isLoggedIn && guestName && (
            <p className="mt-2 text-[11.5px] text-white/55">
              Comentando como <span className="font-medium text-white/85">{guestName}</span>
              {" · "}
              <button
                type="button"
                onClick={() => {
                  setGuestName("");
                  setGuestEmail("");
                  setCookie(GUEST_COOKIE, "", -1);
                  setWelcomeDone(false);
                }}
                className="text-orange hover:underline"
              >
                cambiar
              </button>
            </p>
          )}
        </div>

        {signupVisible && !signupDismissed && !props.isLoggedIn && (
          <CreateAccountPrompt
            guestName={guestName}
            guestEmail={guestEmail}
            reviewSlug={props.slug}
            onDismiss={() => {
              setSignupVisible(false);
              setSignupDismissedLocal(true);
              setCookie(SIGNUP_DISMISSED_COOKIE, "1");
            }}
          />
        )}

        {/* Composer fijo */}
        {composerOpen ? (
          <div className="rounded-2xl border border-orange/40 bg-orange/[0.06] p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-[12px] text-white/85">
                {hasTime ? (
                  <>
                    @ <span className="font-mono text-orange">{fmt(effectiveTimeMs)}</span>
                  </>
                ) : (
                  <span className="text-white/45">Sin marca de tiempo</span>
                )}
                {drawingActive && <span className="ml-2 text-[10px] text-white/45">+ dibujo</span>}
              </div>
              <button
                type="button"
                onClick={() => {
                  setComposerOpen(false);
                  setBody("");
                  setPendingAnnotations([]); setCanvasKey((k) => k + 1);
                  setDrawingActive(false);
                  setTool("select");
                }}
                className="text-[11px] text-white/45 hover:text-white/85"
              >
                Cerrar
              </button>
            </div>

            {/* Nombre/email se piden en el welcome gate. Los inputs aquí solo
                aparecen como fallback si por algún motivo se perdieron. */}
            {!props.isLoggedIn && (!guestName || (props.requireGuestEmail && !guestEmail)) && (
              <div className="mb-2 grid grid-cols-2 gap-2">
                <input
                  required
                  placeholder="Tu nombre"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
                />
                <input
                  required={props.requireGuestEmail}
                  type="email"
                  placeholder={props.requireGuestEmail ? "Tu email *" : "Tu email (opcional)"}
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
                />
              </div>
            )}

            <textarea
              required
              rows={3}
              placeholder="¿Qué hay que cambiar?"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              className="w-full rounded-md border border-white/10 bg-black/30 px-2 py-2 text-[13px] text-white"
            />

            {errorMsg && (
              <div className="mt-2 text-[11px] text-red-300">
                {errorMsg === "name_required"
                  ? "Falta tu nombre"
                  : errorMsg === "email_required"
                  ? "El productor pide email para invitados"
                  : `Error: ${errorMsg}`}
              </div>
            )}

            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={submitting || !body.trim() || !guestReady}
                className="rounded-full bg-orange px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-orange/85 disabled:opacity-40"
              >
                {submitting ? "Enviando…" : "Publicar"}
              </button>
            </div>
          </div>
        ) : null}

        {/* Lista */}
        <div className="flex-1 overflow-y-auto pr-1">
          {rootComments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-white/10 p-4 text-center text-[12px] text-white/50">
              Aún no hay comentarios. Marca un momento del video o escribe la primera nota.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rootComments.map((c) => (
                <CommentCard
                  key={c.id}
                  c={c}
                  onJump={(ms) => seek(ms)}
                  onReply={(body) => reply(c.id, body)}
                  canResolve={props.canResolve}
                  resolving={resolving === c.id}
                  onToggleResolved={() => toggleResolved(c.id, c.resolved)}
                  composeAsGuest={!props.isLoggedIn}
                  guestName={guestName}
                  guestEmail={guestEmail}
                  setGuestName={setGuestName}
                  setGuestEmail={setGuestEmail}
                  requireGuestEmail={props.requireGuestEmail}
                />
              ))}
            </ul>
          )}
        </div>
      </aside>
    </div>
  );
}

function CommentCard({
  c,
  onJump,
  onReply,
  canResolve,
  resolving,
  onToggleResolved,
  composeAsGuest,
  guestName,
  guestEmail,
  setGuestName,
  setGuestEmail,
  requireGuestEmail,
}: {
  c: ReviewComment;
  onJump: (ms: number) => void;
  onReply: (body: string) => Promise<void>;
  canResolve: boolean;
  resolving: boolean;
  onToggleResolved: () => void;
  composeAsGuest: boolean;
  guestName: string;
  guestEmail: string;
  setGuestName: (v: string) => void;
  setGuestEmail: (v: string) => void;
  requireGuestEmail: boolean;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyBody, setReplyBody] = useState("");

  return (
    <li
      className="rounded-xl border p-3"
      style={{
        borderColor: c.resolved ? "rgba(52,199,89,0.35)" : "rgba(255,255,255,0.08)",
        background: c.resolved ? "rgba(52,199,89,0.05)" : "rgba(255,255,255,0.03)",
      }}
    >
      <div className="flex items-center gap-2 text-[12px]">
        <button
          type="button"
          onClick={() => c.videoTimeMs != null && onJump(c.videoTimeMs)}
          disabled={c.videoTimeMs == null}
          className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-orange hover:bg-white/10 disabled:opacity-40"
        >
          {c.videoTimeMs != null ? fmt(c.videoTimeMs) : "--:--"}
        </button>
        <span className="font-medium text-white">{c.displayName}</span>
        {c.isGuest && (
          <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-amber-300">
            invitado
          </span>
        )}
        {c.resolved && (
          <span className="rounded-full bg-green-500/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green-300">
            resuelto
          </span>
        )}
      </div>

      {c.frame && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={c.frame.url}
          alt="frame"
          className="mt-2 w-full cursor-pointer rounded-md border border-white/10"
          onClick={() => c.videoTimeMs != null && onJump(c.videoTimeMs)}
        />
      )}

      <div className="mt-2 whitespace-pre-wrap text-[13px] text-white/85">{c.body}</div>

      <div className="mt-2 flex items-center gap-2 text-[11px]">
        <button
          type="button"
          onClick={() => setReplyOpen((v) => !v)}
          className="text-white/55 hover:text-white"
        >
          Responder
        </button>
        {canResolve && (
          <button
            type="button"
            onClick={onToggleResolved}
            disabled={resolving}
            className="text-white/55 hover:text-white"
          >
            {c.resolved ? "Reabrir" : "Marcar resuelto"}
          </button>
        )}
        <span className="ml-auto text-white/35">
          {new Date(c.createdAt).toLocaleString("es-CO", {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>

      {c.replies && c.replies.length > 0 && (
        <ul className="mt-3 flex flex-col gap-2 border-l border-white/10 pl-3">
          {c.replies.map((r) => (
            <li key={r.id} className="text-[12.5px]">
              <div className="text-[11px] text-white/55">
                <span className="font-medium text-white/85">{r.displayName}</span>
                {r.isGuest && <span className="ml-1 text-amber-300/85">· invitado</span>}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap text-white/80">{r.body}</div>
            </li>
          ))}
        </ul>
      )}

      {replyOpen && (
        <div className="mt-2 flex flex-col gap-1.5">
          {composeAsGuest && (!guestName || (requireGuestEmail && !guestEmail)) && (
            <div className="grid grid-cols-2 gap-1.5">
              <input
                placeholder="Tu nombre"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white"
              />
              <input
                type="email"
                placeholder={requireGuestEmail ? "Email *" : "Email"}
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                className="rounded-md border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-white"
              />
            </div>
          )}
          <textarea
            rows={2}
            placeholder="Tu respuesta…"
            value={replyBody}
            onChange={(e) => setReplyBody(e.target.value)}
            className="rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px] text-white"
          />
          <button
            type="button"
            onClick={async () => {
              if (!replyBody.trim()) return;
              await onReply(replyBody.trim());
              setReplyBody("");
              setReplyOpen(false);
            }}
            className="self-end rounded-full bg-white/10 px-3 py-1 text-[11px] font-medium text-white hover:bg-white/15"
          >
            Responder
          </button>
        </div>
      )}
    </li>
  );
}

function fmt(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}

/** Formato corto "M:SS" sin centésimas. */
function fmtShort(ms: number): string {
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Convierte "M:SS", "MM:SS(.cc)" o segundos sueltos a ms. null si vacío/ inválido. */
function parseTimecode(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  if (/^\d+$/.test(t)) return parseInt(t, 10) * 1000; // solo segundos
  const m = t.match(/^(\d+):([0-5]?\d)(?:\.(\d{1,2}))?$/);
  if (!m) return null;
  const min = parseInt(m[1], 10);
  const sec = parseInt(m[2], 10);
  const cs = m[3] ? parseInt(m[3].padEnd(2, "0"), 10) : 0;
  return (min * 60 + sec) * 1000 + cs * 10;
}
