/**
 * Google Drive integration.
 *
 * Modos:
 *  1) Sin credenciales (modo embed): usa iframe `embeddedfolderview` y `/preview`.
 *     Funciona pero no permite multi-select, ZIP, o detección de cambios.
 *  2) Con `GOOGLE_DRIVE_API_KEY`: lista carpetas públicas vía API. Mejor UX.
 *  3) Con `GOOGLE_SERVICE_ACCOUNT_JSON`: lista carpetas privadas compartidas con la SA.
 */

import { EmbedKind } from "@prisma/client";

export type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: number | null;
  thumbnailUrl: string;
  viewUrl: string;
  downloadUrl: string;
  isImage: boolean;
  isVideo: boolean;
};

export type DriveFolderListing = {
  folderId: string;
  files: DriveFile[];
  fetchedAt: Date;
  source: "api-key" | "service-account" | "embed-fallback";
  error?: string;
};

// ─── URL parsing y detección de tipo ─────────────────────────────

const FOLDER_RE = /\/folders\/([a-zA-Z0-9_-]+)/;
const FILE_RE = /\/file\/d\/([a-zA-Z0-9_-]+)/;
const OPEN_ID_RE = /[?&]id=([a-zA-Z0-9_-]+)/;
const VIMEO_RE = /vimeo\.com\/(?:video\/)?(\d+)/;
const YOUTUBE_RE = /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractDriveFolderId(url: string): string | null {
  const m = url.match(FOLDER_RE);
  return m?.[1] ?? null;
}

export function extractDriveFileId(url: string): string | null {
  const m = url.match(FILE_RE) ?? url.match(OPEN_ID_RE);
  return m?.[1] ?? null;
}

export function extractVimeoId(url: string): string | null {
  return url.match(VIMEO_RE)?.[1] ?? null;
}

export function extractYouTubeId(url: string): string | null {
  return url.match(YOUTUBE_RE)?.[1] ?? null;
}

/**
 * Detecta el tipo de embed a partir de una URL.
 * No requiere acceso a red — solo parsea la URL.
 * Para folders, asume DRIVE_FOLDER_PHOTOS (se resuelve después con listFolder).
 */
export function detectEmbedKind(url: string): {
  kind: EmbedKind;
  folderId?: string;
  fileId?: string;
} {
  const trimmed = url.trim();
  if (!trimmed) return { kind: EmbedKind.NONE };

  const folderId = extractDriveFolderId(trimmed);
  if (folderId) {
    // Después confirmamos si es photos/videos/mixed según contenido
    return { kind: EmbedKind.DRIVE_FOLDER_PHOTOS, folderId };
  }

  const fileId = extractDriveFileId(trimmed);
  if (fileId && /drive\.google\.com/.test(trimmed)) {
    return { kind: EmbedKind.DRIVE_FILE, fileId };
  }

  if (extractVimeoId(trimmed)) return { kind: EmbedKind.VIMEO };
  if (extractYouTubeId(trimmed)) return { kind: EmbedKind.YOUTUBE };

  if (/\.(mp4|webm|mov)(\?|$)/i.test(trimmed)) return { kind: EmbedKind.DIRECT_VIDEO };
  if (/\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(trimmed)) return { kind: EmbedKind.IMAGE };

  return { kind: EmbedKind.EXTERNAL_LINK };
}

// ─── URLs útiles ─────────────────────────────────────────────────

export function driveFileViewUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/view`;
}

export function driveFilePreviewIframeUrl(fileId: string): string {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

export function driveFolderEmbedIframeUrl(folderId: string): string {
  return `https://drive.google.com/embeddedfolderview?id=${folderId}#grid`;
}

export function driveImageThumbnailUrl(fileId: string, size = 400): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`;
}

/**
 * Para imágenes — URL de visualización full size.
 * lh3 es el CDN de Google que sirve archivos de Drive con muy buena perf.
 */
export function driveImageFullUrl(fileId: string, width = 1920): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

export function driveDirectDownloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

export function vimeoEmbedUrl(videoId: string): string {
  // api=1 habilita la API de postMessage (playProgress/pause) para leer el
  // segundo actual del video desde la página de revisión.
  return `https://player.vimeo.com/video/${videoId}?api=1`;
}

export function youtubeEmbedUrl(videoId: string): string {
  // enablejsapi=1 habilita la IFrame API por postMessage (infoDelivery →
  // currentTime) para leer el segundo actual desde la página de revisión.
  return `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
}

// ─── API: listar contenidos de una carpeta ───────────────────────

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

type RawDriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  size?: string;
  thumbnailLink?: string;
};

function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

function toDriveFile(raw: RawDriveFile): DriveFile {
  return {
    id: raw.id,
    name: raw.name,
    mimeType: raw.mimeType,
    modifiedTime: raw.modifiedTime,
    size: raw.size ? parseInt(raw.size, 10) : null,
    thumbnailUrl: isImageMime(raw.mimeType)
      ? driveImageThumbnailUrl(raw.id, 400)
      : raw.thumbnailLink ?? driveImageThumbnailUrl(raw.id, 400),
    viewUrl: driveFileViewUrl(raw.id),
    downloadUrl: driveDirectDownloadUrl(raw.id),
    isImage: isImageMime(raw.mimeType),
    isVideo: isVideoMime(raw.mimeType),
  };
}

/**
 * Lista archivos en una carpeta de Drive.
 * Intenta en orden:
 *   1. Service Account (si hay GOOGLE_SERVICE_ACCOUNT_JSON)
 *   2. API Key (si hay GOOGLE_DRIVE_API_KEY)
 *   3. Throw — el caller debe usar fallback embed
 */
export async function listFolder(folderId: string): Promise<DriveFolderListing> {
  const fetchedAt = new Date();

  // Intento 1: Service Account
  const sa = await tryServiceAccountList(folderId).catch(() => null);
  if (sa) {
    return { folderId, files: sa, fetchedAt, source: "service-account" };
  }

  // Intento 2: API Key
  const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
  if (apiKey) {
    try {
      const url =
        `${DRIVE_API_BASE}/files?` +
        new URLSearchParams({
          q: `'${folderId}' in parents and trashed = false`,
          fields:
            "files(id,name,mimeType,modifiedTime,size,thumbnailLink),nextPageToken",
          pageSize: "200",
          orderBy: "name",
          key: apiKey,
        });
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`Drive API ${res.status}: ${body.slice(0, 200)}`);
      }
      const data = (await res.json()) as { files?: RawDriveFile[] };
      const files = (data.files ?? []).map(toDriveFile);
      return { folderId, files, fetchedAt, source: "api-key" };
    } catch (e) {
      const msg = e instanceof Error ? e.message : "unknown";
      console.warn("[drive] API key list failed:", msg);
      return {
        folderId,
        files: [],
        fetchedAt,
        source: "embed-fallback",
        error: msg,
      };
    }
  }

  // Sin credenciales — devolvemos vacío y el caller usará embed fallback
  return {
    folderId,
    files: [],
    fetchedAt,
    source: "embed-fallback",
    error: "No credentials configured",
  };
}

/**
 * Determina el tipo refinado de carpeta según su contenido.
 */
export function classifyFolder(files: DriveFile[]): EmbedKind {
  const imgs = files.filter((f) => f.isImage).length;
  const vids = files.filter((f) => f.isVideo).length;
  if (imgs > 0 && vids === 0) return EmbedKind.DRIVE_FOLDER_PHOTOS;
  if (vids > 0 && imgs === 0) return EmbedKind.DRIVE_FOLDER_VIDEOS;
  if (imgs > 0 && vids > 0) return EmbedKind.DRIVE_FOLDER_MIXED;
  return EmbedKind.DRIVE_FOLDER_PHOTOS;
}

// ─── Service Account ─────────────────────────────────────────────

type ServiceAccountCreds = {
  client_email: string;
  private_key: string;
};

let saTokenCache: { token: string; expiresAt: number } | null = null;

function getSACreds(): ServiceAccountCreds | null {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    console.warn("[drive] GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON");
    return null;
  }
}

async function getServiceAccountAccessToken(): Promise<string | null> {
  const creds = getSACreds();
  if (!creds) return null;

  if (saTokenCache && saTokenCache.expiresAt > Date.now() + 60_000) {
    return saTokenCache.token;
  }

  const now = Math.floor(Date.now() / 1000);
  const claim = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/drive.readonly",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  // JWT sign (RS256) — usamos crypto del runtime de Node
  const { createSign } = await import("node:crypto");
  const header = { alg: "RS256", typ: "JWT" };
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const unsigned = `${enc(header)}.${enc(claim)}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign
    .sign(creds.private_key.replace(/\\n/g, "\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });
  if (!res.ok) {
    console.warn("[drive] SA token exchange failed:", res.status);
    return null;
  }
  const json = (await res.json()) as { access_token: string; expires_in: number };
  saTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

async function tryServiceAccountList(folderId: string): Promise<DriveFile[] | null> {
  const token = await getServiceAccountAccessToken();
  if (!token) return null;
  try {
    const url =
      `${DRIVE_API_BASE}/files?` +
      new URLSearchParams({
        q: `'${folderId}' in parents and trashed = false`,
        fields:
          "files(id,name,mimeType,modifiedTime,size,thumbnailLink)",
        pageSize: "500",
        orderBy: "name",
      });
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      console.warn("[drive] SA list failed:", res.status, body.slice(0, 200));
      return null;
    }
    const data = (await res.json()) as { files?: RawDriveFile[] };
    return (data.files ?? []).map(toDriveFile);
  } catch (e) {
    console.warn("[drive] SA list exception:", e);
    return null;
  }
}

// ─── Helpers para snapshots (detectar cambios) ───────────────────

export type DriveSnapshot = {
  ids: string[];
  modifiedTimes: Record<string, string>;
  count: number;
};

export function makeSnapshot(files: DriveFile[]): DriveSnapshot {
  return {
    count: files.length,
    ids: files.map((f) => f.id).sort(),
    modifiedTimes: Object.fromEntries(
      files.map((f) => [f.id, f.modifiedTime ?? ""]),
    ),
  };
}

export type SnapshotDiff = {
  added: string[];
  removed: string[];
  modified: string[];
  hasChanges: boolean;
};

export function diffSnapshots(
  prev: DriveSnapshot | null,
  next: DriveSnapshot,
): SnapshotDiff {
  if (!prev) {
    return {
      added: next.ids,
      removed: [],
      modified: [],
      hasChanges: next.ids.length > 0,
    };
  }
  const prevSet = new Set(prev.ids);
  const nextSet = new Set(next.ids);
  const added = next.ids.filter((id) => !prevSet.has(id));
  const removed = prev.ids.filter((id) => !nextSet.has(id));
  const modified: string[] = [];
  for (const id of next.ids) {
    if (prevSet.has(id) && prev.modifiedTimes[id] !== next.modifiedTimes[id]) {
      modified.push(id);
    }
  }
  return {
    added,
    removed,
    modified,
    hasChanges: added.length + removed.length + modified.length > 0,
  };
}

export function hasDriveCredentials(): {
  apiKey: boolean;
  serviceAccount: boolean;
} {
  return {
    apiKey: Boolean(process.env.GOOGLE_DRIVE_API_KEY),
    serviceAccount: Boolean(getSACreds()),
  };
}
