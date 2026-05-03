/**
 * Storage adapter:
 *   - Si BLOB_READ_WRITE_TOKEN está set → Vercel Blob
 *   - Si no → fallback a /public/uploads (dev local)
 *
 * Esto permite que la app funcione en dev sin Blob, y en prod con Blob persistente.
 */

import { put, del, list as blobList } from "@vercel/blob";
import { writeFile, mkdir, readdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";

const LOCAL_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), "public", "uploads");
const LOCAL_PUBLIC_PATH = process.env.PUBLIC_UPLOADS_PATH ?? "/uploads";

export type StoredAsset = {
  url: string;
  pathname: string;
  storage: "blob" | "local";
  size: number;
  mimeType: string;
};

export function isBlobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

function safeFilename(originalName: string): string {
  const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]+/g, "");
  const base = randomBytes(16).toString("hex");
  return `${base}${ext}`;
}

/**
 * Sube un archivo y devuelve la URL pública.
 */
export async function uploadFile(args: {
  file: File;
  filename?: string;
  prefix?: string;
}): Promise<StoredAsset> {
  const filename = safeFilename(args.filename ?? args.file.name);
  const path = args.prefix ? `${args.prefix}/${filename}` : filename;

  if (isBlobConfigured()) {
    const blob = await put(path, args.file, {
      access: "public",
      contentType: args.file.type || "application/octet-stream",
      addRandomSuffix: false,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });
    return {
      url: blob.url,
      pathname: blob.pathname,
      storage: "blob",
      size: args.file.size,
      mimeType: args.file.type || "application/octet-stream",
    };
  }

  // Fallback local
  if (!existsSync(LOCAL_DIR)) {
    await mkdir(LOCAL_DIR, { recursive: true });
  }
  const buf = Buffer.from(await args.file.arrayBuffer());
  await writeFile(join(LOCAL_DIR, filename), buf);
  return {
    url: `${LOCAL_PUBLIC_PATH}/${filename}`,
    pathname: filename,
    storage: "local",
    size: args.file.size,
    mimeType: args.file.type || "application/octet-stream",
  };
}

/**
 * Borra un archivo previamente subido.
 */
export async function deleteFile(args: {
  storage: "blob" | "local";
  pathnameOrUrl: string;
}): Promise<void> {
  if (args.storage === "blob") {
    if (!isBlobConfigured()) return;
    try {
      await del(args.pathnameOrUrl, {
        token: process.env.BLOB_READ_WRITE_TOKEN!,
      });
    } catch (e) {
      console.warn("[blob] delete failed:", e);
    }
    return;
  }
  // Local: no borramos por seguridad
}

/**
 * Lista archivos del storage. Usado solo internamente, no expuesto al usuario.
 */
export async function listFiles(prefix?: string) {
  if (isBlobConfigured()) {
    const result = await blobList({
      prefix,
      token: process.env.BLOB_READ_WRITE_TOKEN!,
    });
    return result.blobs.map((b) => ({
      url: b.url,
      pathname: b.pathname,
      size: b.size,
      uploadedAt: b.uploadedAt,
    }));
  }
  if (!existsSync(LOCAL_DIR)) return [];
  const files = await readdir(LOCAL_DIR);
  const out = [];
  for (const f of files) {
    if (f.startsWith(".")) continue;
    const s = await stat(join(LOCAL_DIR, f));
    out.push({
      url: `${LOCAL_PUBLIC_PATH}/${f}`,
      pathname: f,
      size: s.size,
      uploadedAt: s.mtime,
    });
  }
  return out;
}

export const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/gif",
  "image/svg+xml",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
]);

export const MAX_BYTES =
  parseInt(process.env.MAX_UPLOAD_MB ?? "50", 10) * 1024 * 1024;
