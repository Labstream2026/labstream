import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isReviewLinkActive } from "@/lib/review";
import { rateLimit } from "@/lib/rate-limit";
import { uploadFile } from "@/lib/blob-storage";

const schema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,/),
});

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB por screenshot

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const link = await prisma.reviewLink.findUnique({ where: { slug } });
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const active = isReviewLinkActive(link);
  if (!active.active) return NextResponse.json({ error: "gone" }, { status: 410 });

  // Solo usuarios autenticados o invitados explícitamente permitidos pueden subir frames.
  const session = await auth();
  if (!session?.user && !link.allowGuests) {
    return NextResponse.json({ error: "guests_not_allowed" }, { status: 403 });
  }

  // Rate limit best-effort: 20 frames / minuto por slug (anti-abuso de storage).
  if (!rateLimit(`frame:${slug}`, 20, 60_000)) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  // Decodifica data URL → Buffer y valida tamaño antes de subir
  const m = parsed.data.dataUrl.match(/^data:(image\/(?:png|jpeg|webp));base64,(.+)$/);
  if (!m) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const mime = m[1];
  const buf = Buffer.from(m[2], "base64");
  if (buf.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const ext = mime === "image/jpeg" ? ".jpg" : mime === "image/webp" ? ".webp" : ".png";
  const file = new File([new Uint8Array(buf)], `frame-${Date.now()}${ext}`, { type: mime });

  const stored = await uploadFile({ file, prefix: `review/${slug}/frames` });

  const asset = await prisma.asset.create({
    data: {
      source: "UPLOAD",
      filename: file.name,
      mimeType: mime,
      sizeBytes: buf.byteLength,
      url: stored.url,
      storage: stored.storage,
      blobPath: stored.storage === "blob" ? stored.pathname : null,
    },
    select: { id: true, url: true },
  });

  return NextResponse.json({ ok: true, assetId: asset.id, url: asset.url });
}
