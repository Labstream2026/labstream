import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReviewLinkActive } from "@/lib/review";

/**
 * Proxy de streaming desde Google Drive para que <video> nativo pueda reproducir
 * archivos privados (compartidos con la service account) o públicos (con API key).
 *
 * Soporta Range requests — el navegador pide chunks y nosotros los retransmitimos
 * sin bufferizar todo en memoria.
 *
 * Ruta protegida por slug del review link. Si el link no existe / expira / fue
 * revocado, devuelve 404.
 */

const DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";

let saTokenCache: { token: string; expiresAt: number } | null = null;

async function getServiceAccountAccessToken(): Promise<string | null> {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;

  let creds: { client_email: string; private_key: string };
  try {
    creds = JSON.parse(raw);
    if (!creds.client_email || !creds.private_key) return null;
  } catch {
    return null;
  }

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

  const { createSign } = await import("node:crypto");
  const enc = (obj: object) =>
    Buffer.from(JSON.stringify(obj))
      .toString("base64")
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  const unsigned = `${enc({ alg: "RS256", typ: "JWT" })}.${enc(claim)}`;
  const sign = createSign("RSA-SHA256");
  sign.update(unsigned);
  const signature = sign
    .sign(creds.private_key.replace(/\\n/g, "\n"))
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsigned}.${signature}`,
    }),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as { access_token: string; expires_in: number };
  saTokenCache = {
    token: json.access_token,
    expiresAt: Date.now() + json.expires_in * 1000,
  };
  return json.access_token;
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const link = await prisma.reviewLink.findUnique({
    where: { slug },
    include: { version: true },
  });
  if (!link) return new NextResponse("Not found", { status: 404 });

  const active = isReviewLinkActive(link);
  if (!active.active) return new NextResponse("Gone", { status: 410 });

  const fileId = link.version.driveFileId;
  if (!fileId) {
    // Si la versión es un mp4 directo, redirigimos al externalUrl (más eficiente que proxy)
    if (link.version.externalUrl) {
      return NextResponse.redirect(link.version.externalUrl, 302);
    }
    return new NextResponse("Not a streamable video", { status: 400 });
  }

  // Construimos la URL de Drive `alt=media` y reenviamos Range si existe
  const driveUrl = `${DRIVE_API_BASE}/files/${fileId}?alt=media`;
  const range = req.headers.get("range") ?? undefined;

  const headers: Record<string, string> = {};
  if (range) headers["Range"] = range;

  // Auth: service account primero, luego api key
  const saToken = await getServiceAccountAccessToken();
  let url = driveUrl;
  if (saToken) {
    headers["Authorization"] = `Bearer ${saToken}`;
  } else if (process.env.GOOGLE_DRIVE_API_KEY) {
    url = `${driveUrl}&key=${process.env.GOOGLE_DRIVE_API_KEY}`;
  } else {
    return new NextResponse(
      "Drive credentials not configured for streaming proxy",
      { status: 500 },
    );
  }

  const upstream = await fetch(url, { headers });

  if (!upstream.ok && upstream.status !== 206) {
    const body = await upstream.text();
    console.error("[review/stream] upstream error", upstream.status, body.slice(0, 300));
    return new NextResponse("Upstream error", { status: 502 });
  }

  const respHeaders = new Headers();
  const passthrough = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
    "cache-control",
  ];
  for (const h of passthrough) {
    const v = upstream.headers.get(h);
    if (v) respHeaders.set(h, v);
  }
  if (!respHeaders.has("accept-ranges")) {
    respHeaders.set("accept-ranges", "bytes");
  }
  if (!respHeaders.has("cache-control")) {
    respHeaders.set("cache-control", "private, max-age=3600");
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: respHeaders,
  });
}
