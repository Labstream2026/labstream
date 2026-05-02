import { NextResponse } from "next/server";
import { writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join, extname } from "node:path";
import { randomBytes } from "node:crypto";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetSource } from "@prisma/client";

const UPLOADS_DIR =
  process.env.UPLOADS_DIR ?? join(process.cwd(), "public", "uploads");
const PUBLIC_PATH = process.env.PUBLIC_UPLOADS_PATH ?? "/uploads";
const MAX_BYTES = parseInt(process.env.MAX_UPLOAD_MB ?? "50", 10) * 1024 * 1024;

const ALLOWED_MIME = new Set([
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

function safeFilename(originalName: string) {
  const ext = extname(originalName).toLowerCase().replace(/[^a-z0-9.]+/g, "");
  const base = randomBytes(16).toString("hex");
  return `${base}${ext}`;
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/cms/login", req.url));
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.redirect(
      new URL("/cms/assets?error=upload_failed", req.url),
    );
  }

  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim() || null;

  if (!(file instanceof File)) {
    return NextResponse.redirect(
      new URL("/cms/assets?error=upload_failed", req.url),
    );
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.redirect(
      new URL("/cms/assets?error=upload_failed", req.url),
    );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return NextResponse.redirect(
      new URL("/cms/assets?error=upload_failed", req.url),
    );
  }

  if (!existsSync(UPLOADS_DIR)) {
    await mkdir(UPLOADS_DIR, { recursive: true });
  }

  const filename = safeFilename(file.name);
  const targetPath = join(UPLOADS_DIR, filename);
  const buf = Buffer.from(await file.arrayBuffer());
  await writeFile(targetPath, buf);

  await prisma.asset.create({
    data: {
      source: AssetSource.UPLOAD,
      filename: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      url: `${PUBLIC_PATH}/${filename}`,
      alt,
      uploadedById: session.user.id,
    },
  });

  return NextResponse.redirect(
    new URL("/cms/assets?ok=uploaded", req.url),
    303,
  );
}
