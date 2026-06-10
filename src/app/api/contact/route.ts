import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().max(160),
  message: z.string().min(1).max(4000),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  // Anti-spam: 5 envíos / 10 min por IP.
  if (!rateLimit(`contact:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const { name, email, message, source } = parsed.data;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { contactEmail: true, siteName: true },
  });

  const teamInbox =
    process.env.CONTACT_EMAIL_TO ||
    settings?.contactEmail ||
    "contacto@labstreamsas.com";
  const siteName = settings?.siteName ?? "Labstream Studio";
  // Remitente específico para emails del formulario de contacto público.
  // Cae a EMAIL_FROM si no está configurado.
  const contactFrom =
    process.env.EMAIL_FROM_CONTACT || process.env.EMAIL_FROM;

  // 1. Save to DB so the team has an inbox even if email fails
  await prisma.lead
    .create({
      data: {
        name,
        email: email.toLowerCase(),
        message,
        source: source ?? "contact-form",
      },
    })
    .catch((e) => {
      console.error("[contact] failed to save Lead", e);
    });

  // 2. Notify the team
  const teamSubject = `Nuevo mensaje de ${name} — ${siteName}`;
  const teamHtml = `
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
        Responde directamente a este correo para contactar al remitente. También aparece en /cms/leads.
      </p>
    </div>
  `;

  const teamResult = await sendEmail({
    to: teamInbox,
    subject: teamSubject,
    html: teamHtml,
    replyTo: email,
    from: contactFrom,
  });

  // 3. Send auto-reply to the customer (best-effort, don't fail the request if this fails)
  const customerSubject = `Recibimos tu mensaje, ${name.split(" ")[0]} — ${siteName}`;
  const customerHtml = `
    <div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:32px 24px;border-radius:12px;max-width:560px;margin:0 auto">
      <p style="margin:0 0 12px;font-size:11px;font-family:ui-monospace,monospace;letter-spacing:0.15em;color:#E8640C;text-transform:uppercase">
        // Confirmación
      </p>
      <h1 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:32px;line-height:1.1;margin:0 0 20px;color:#fff">
        Gracias por escribirnos
      </h1>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85)">
        Hola ${escapeHtml(name.split(" ")[0])}, recibimos tu mensaje y nuestro equipo te responderá en menos de 24 horas en horario laboral (Bogotá, GMT-5).
      </p>
      <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85)">
        Si es urgente, puedes escribirnos directamente a
        <a href="mailto:${escapeHtml(teamInbox)}" style="color:#E8640C">${escapeHtml(teamInbox)}</a>.
      </p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.1);margin:24px 0" />
      <p style="margin:0 0 8px;font-size:13px;color:rgba(255,255,255,0.55)">Tu mensaje:</p>
      <div style="white-space:pre-wrap;font-size:14px;line-height:1.55;color:rgba(255,255,255,0.7);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px 16px">${escapeHtml(message)}</div>
      <p style="margin:32px 0 0;font-size:13px;color:rgba(255,255,255,0.65)">
        — Equipo ${escapeHtml(siteName)}
      </p>
    </div>
  `;

  // best-effort: no debe tumbar la request si la auto-respuesta falla
  await sendEmail({
    to: email,
    subject: customerSubject,
    html: customerHtml,
    replyTo: teamInbox,
    from: contactFrom,
  }).catch((e) => {
    console.error("[contact] auto-reply failed", e);
  });

  if (!teamResult.ok) {
    // Lead is saved in DB; surface a soft error so the form shows feedback but the message isn't lost.
    return NextResponse.json(
      { ok: false, error: "send_failed", saved: true },
      { status: 502 },
    );
  }

  return NextResponse.json({ ok: true, skipped: teamResult.skipped ?? false });
}
