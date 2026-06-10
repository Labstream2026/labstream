import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";
import { rateLimit, clientIp } from "@/lib/rate-limit";

const schema = z.object({
  email: z.string().email().max(160),
  name: z.string().max(120).optional(),
  source: z.string().max(40).optional(),
});

export async function POST(req: Request) {
  // Anti-spam: 5 suscripciones / 10 min por IP.
  if (!rateLimit(`newsletter:${clientIp(req)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "invalid" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const name = parsed.data.name;

  const settings = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
    select: { contactEmail: true, siteName: true },
  });
  const siteName = settings?.siteName ?? "Labstream Studio";
  const teamInbox =
    process.env.CONTACT_EMAIL_TO ||
    settings?.contactEmail ||
    "hola@labstream.co";

  const existing = await prisma.newsletterSignup.findUnique({
    where: { email },
  });

  await prisma.newsletterSignup
    .upsert({
      where: { email },
      update: { name },
      create: {
        email,
        name,
        source: parsed.data.source ?? "footer",
      },
    })
    .catch(() => null);

  // Confirmation email — only on first signup, best-effort
  if (!existing) {
    const greeting = name ? `Hola ${escapeHtml(name.split(" ")[0])}` : "Hola";
    const html = `
      <div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:32px 24px;border-radius:12px;max-width:560px;margin:0 auto">
        <p style="margin:0 0 12px;font-size:11px;font-family:ui-monospace,monospace;letter-spacing:0.15em;color:#E8640C;text-transform:uppercase">
          // Newsletter
        </p>
        <h1 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:30px;line-height:1.1;margin:0 0 20px;color:#fff">
          Estás en la lista
        </h1>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85)">
          ${greeting}, gracias por suscribirte. Una vez al mes te enviaremos casos de estudio + behind the scenes — sin spam, solo lo bueno.
        </p>
        <p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:rgba(255,255,255,0.85)">
          Mientras tanto, échale un vistazo a nuestro
          <a href="https://labstreamsas.com/portafolio" style="color:#E8640C">portafolio</a>
          o a las
          <a href="https://labstreamsas.com/blog" style="color:#E8640C">notas de campo</a>.
        </p>
        <p style="margin:32px 0 0;font-size:13px;color:rgba(255,255,255,0.65)">
          — Equipo ${escapeHtml(siteName)}
        </p>
        <p style="margin:24px 0 0;font-size:11px;color:rgba(255,255,255,0.4)">
          Si no te suscribiste tú, ignora este correo.
        </p>
      </div>
    `;

    await sendEmail({
      to: email,
      subject: `Estás en la lista — ${siteName}`,
      html,
      replyTo: teamInbox,
    });
  }

  return NextResponse.json({ ok: true });
}
