import { randomBytes } from "node:crypto";
import { EmbedKind } from "@prisma/client";
import {
  driveFilePreviewIframeUrl,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
  extractVimeoId,
  extractYouTubeId,
} from "@/lib/google-drive";

/** Genera un slug unguessable para review links (24 chars base64url). */
export function generateReviewSlug(): string {
  return randomBytes(18)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Tipos de "modo de player" que el cliente puede ver. */
export type PlayerMode =
  | { kind: "video"; src: string; poster?: string } // <video> nativo, anotaciones completas
  | { kind: "iframe"; src: string }                   // iframe (Drive/YouTube/Vimeo), solo timecode
  | { kind: "image"; src: string }                    // imagen estática
  | { kind: "unsupported"; url: string };

type VersionLike = {
  id: string;
  externalUrl: string | null;
  embedKind: EmbedKind;
  driveFileId: string | null;
};

/**
 * Decide cómo reproducir la versión.
 * Si forceProxy=true y es Drive, usa el endpoint /api/review/.../stream
 * para que se renderice en <video> nativo (anotaciones completas).
 */
export function resolvePlayer(
  v: VersionLike,
  opts: { reviewSlug?: string; forceProxy?: boolean } = {},
): PlayerMode {
  if (!v.externalUrl) return { kind: "unsupported", url: "" };

  // Drive file individual
  if (v.driveFileId && v.embedKind === EmbedKind.DRIVE_FILE) {
    if (opts.forceProxy && opts.reviewSlug) {
      return {
        kind: "video",
        src: `/api/review/${opts.reviewSlug}/stream`,
      };
    }
    return { kind: "iframe", src: driveFilePreviewIframeUrl(v.driveFileId) };
  }

  // Video directo .mp4 / .webm / .mov
  if (v.embedKind === EmbedKind.DIRECT_VIDEO) {
    return { kind: "video", src: v.externalUrl };
  }

  // Vimeo
  if (v.embedKind === EmbedKind.VIMEO) {
    const id = extractVimeoId(v.externalUrl);
    if (id) return { kind: "iframe", src: vimeoEmbedUrl(id) };
  }

  // YouTube
  if (v.embedKind === EmbedKind.YOUTUBE) {
    const id = extractYouTubeId(v.externalUrl);
    if (id) return { kind: "iframe", src: youtubeEmbedUrl(id) };
  }

  // Imagen
  if (v.embedKind === EmbedKind.IMAGE) {
    return { kind: "image", src: v.externalUrl };
  }

  return { kind: "unsupported", url: v.externalUrl };
}

/** ¿El link está activo (no revocado, no expirado)? */
export function isReviewLinkActive(link: {
  revokedAt: Date | null;
  expiresAt: Date | null;
}): { active: true } | { active: false; reason: "revoked" | "expired" } {
  if (link.revokedAt) return { active: false, reason: "revoked" };
  if (link.expiresAt && link.expiresAt.getTime() < Date.now()) {
    return { active: false, reason: "expired" };
  }
  return { active: true };
}

/** Annotación: tipo + coords normalizadas 0-1. */
export type Annotation =
  | { kind: "rect"; x: number; y: number; w: number; h: number; color: string; stroke?: number }
  | { kind: "arrow"; x1: number; y1: number; x2: number; y2: number; color: string; stroke?: number }
  | { kind: "pen"; points: Array<[number, number]>; color: string; stroke?: number }
  | { kind: "text"; x: number; y: number; text: string; color: string; size?: number };

/** Forma compacta para guardar en JSON. Validamos con shape básico. */
export function isValidAnnotation(a: unknown): a is Annotation {
  if (!a || typeof a !== "object") return false;
  const o = a as Record<string, unknown>;
  if (typeof o.kind !== "string") return false;
  if (typeof o.color !== "string") return false;
  switch (o.kind) {
    case "rect":
      return (
        typeof o.x === "number" &&
        typeof o.y === "number" &&
        typeof o.w === "number" &&
        typeof o.h === "number"
      );
    case "arrow":
      return (
        typeof o.x1 === "number" &&
        typeof o.y1 === "number" &&
        typeof o.x2 === "number" &&
        typeof o.y2 === "number"
      );
    case "pen":
      return (
        Array.isArray(o.points) &&
        o.points.every(
          (p) =>
            Array.isArray(p) &&
            p.length === 2 &&
            typeof p[0] === "number" &&
            typeof p[1] === "number",
        )
      );
    case "text":
      return (
        typeof o.x === "number" &&
        typeof o.y === "number" &&
        typeof o.text === "string"
      );
    default:
      return false;
  }
}

export function formatTimecode(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const cs = Math.floor((ms % 1000) / 10);
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${cs.toString().padStart(2, "0")}`;
}
