import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetSource } from "@prisma/client";
import { canAccessCms } from "@/lib/cms-guard";
import { publicBase } from "@/lib/public-url";
import {
  uploadFile,
  isBlobConfigured,
  ALLOWED_MIME,
  MAX_BYTES,
} from "@/lib/blob-storage";

export async function POST(req: Request) {
  const base = publicBase(req);
  const session = await auth();
  if (!session?.user) {
    return NextResponse.redirect(new URL("/cms/login", base));
  }
  if (!canAccessCms(session.user.kind)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.redirect(
      new URL("/cms/assets?error=upload_failed", base),
    );
  }

  const file = formData.get("file");
  const alt = String(formData.get("alt") ?? "").trim() || null;
  const isJsonResponse = formData.get("json") === "1";

  if (!(file instanceof File)) {
    return isJsonResponse
      ? NextResponse.json({ ok: false, error: "no_file" }, { status: 400 })
      : NextResponse.redirect(
          new URL("/cms/assets?error=upload_failed", base),
        );
  }

  if (file.size > MAX_BYTES) {
    return isJsonResponse
      ? NextResponse.json({ ok: false, error: "too_large" }, { status: 400 })
      : NextResponse.redirect(
          new URL("/cms/assets?error=upload_failed", base),
        );
  }

  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return isJsonResponse
      ? NextResponse.json({ ok: false, error: "bad_type" }, { status: 400 })
      : NextResponse.redirect(
          new URL("/cms/assets?error=upload_failed", base),
        );
  }

  const stored = await uploadFile({
    file,
    filename: file.name,
    prefix: "uploads",
  });

  const asset = await prisma.asset.create({
    data: {
      source: AssetSource.UPLOAD,
      filename: file.name,
      mimeType: mime,
      sizeBytes: file.size,
      url: stored.url,
      storage: stored.storage,
      blobPath: stored.storage === "blob" ? stored.pathname : null,
      alt,
      uploadedById: session.user.id,
    },
  });

  if (isJsonResponse) {
    return NextResponse.json({
      ok: true,
      asset: {
        id: asset.id,
        url: asset.url,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.sizeBytes,
      },
      storageMode: isBlobConfigured() ? "blob" : "local",
    });
  }

  return NextResponse.redirect(
    new URL("/cms/assets?ok=uploaded", base),
    303,
  );
}
