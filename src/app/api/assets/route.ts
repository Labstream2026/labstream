import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AssetSource } from "@prisma/client";
import { detectEmbedKind, driveImageThumbnailUrl } from "@/lib/google-drive";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = new URL(req.url);
  const search = url.searchParams.get("q")?.toLowerCase() ?? "";
  const type = url.searchParams.get("type");

  const where: Record<string, unknown> = {};
  if (search) {
    where.OR = [
      { filename: { contains: search, mode: "insensitive" } },
      { alt: { contains: search, mode: "insensitive" } },
    ];
  }
  if (type === "image") where.mimeType = { startsWith: "image/" };
  if (type === "video") where.mimeType = { startsWith: "video/" };

  const assets = await prisma.asset.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 60,
  });

  return NextResponse.json({
    ok: true,
    assets: assets.map((a) => ({
      id: a.id,
      url: a.url,
      thumbnailUrl: a.thumbnailUrl ?? a.url,
      filename: a.filename,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
      source: a.source,
      alt: a.alt,
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

/**
 * POST /api/assets
 * Crea un asset desde una URL externa (Drive, Vimeo, etc.)
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = (await req.json()) as { url?: string; alt?: string };
  const url = (body.url ?? "").trim();
  const alt = (body.alt ?? "").trim() || null;
  if (!url || !/^https?:\/\//i.test(url)) {
    return NextResponse.json({ ok: false, error: "invalid_url" }, { status: 400 });
  }

  const detected = detectEmbedKind(url);
  let thumbnailUrl: string | null = null;
  if (detected.fileId) {
    thumbnailUrl = driveImageThumbnailUrl(detected.fileId, 400);
  }

  const asset = await prisma.asset.create({
    data: {
      source: AssetSource.URL,
      url,
      thumbnailUrl,
      alt,
      storage: "external",
      uploadedById: session.user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    asset: {
      id: asset.id,
      url: asset.url,
      thumbnailUrl: asset.thumbnailUrl,
      filename: asset.filename,
      mimeType: asset.mimeType,
    },
  });
}
