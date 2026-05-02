import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(160),
  message: z.string().min(1).max(2000),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { name, email, message } = parsed.data;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { contactEmail: true, siteName: true },
  });

  const to =
    process.env.CONTACT_EMAIL_TO ||
    settings?.contactEmail ||
    "hola@labstream.studio";

  const subject = `Nuevo mensaje de ${name} — ${settings?.siteName ?? "Labstream"}`;

  const html = `
    <div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:560px;margin:0 auto">
      <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:24px;margin:0 0 16px;color:#fff">
        Nuevo mensaje desde la web
      </h2>
      <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.55)">De</p>
      <p style="margin:0 0 16px;font-size:15px;color:#fff">
        <strong>${escapeHtml(name)}</strong> · <a href="mailto:${escapeHtml(email)}" style="color:#E8640C">${escapeHtml(email)}</a>
      </p>
      <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.55)">Mensaje</p>
      <div style="white-space:pre-wrap;font-size:15px;line-height:1.55;color:rgba(255,255,255,0.85);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px 16px">${escapeHtml(message)}</div>
      <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.4)">
        Responde directamente a este correo para contactar al remitente.
      </p>
    </div>
  `;

  const result = await sendEmail({
    to,
    subject,
    html,
    replyTo: email,
  });

  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: "send_failed" },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: result.skipped ?? false });
}
