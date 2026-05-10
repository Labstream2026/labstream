import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail, escapeHtml } from "@/lib/email";

const schema = z.object({
  name: z.string().min(2).max(120),
  email: z.string().email().max(200),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;

  const link = await prisma.reviewLink.findUnique({
    where: { slug },
    include: {
      version: {
        include: {
          deliverable: {
            include: {
              project: {
                include: {
                  clientOrg: true,
                  producerOrg: { include: { members: { include: { user: true } } } },
                },
              },
            },
          },
        },
      },
    },
  });
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const { name, email } = parsed.data;
  const project = link.version.deliverable.project;

  // Guarda como Lead para que aparezca en /cms/leads (bandeja existente)
  await prisma.lead
    .create({
      data: {
        name,
        email: email.toLowerCase(),
        message: `Solicita acceso a la plataforma desde la revisión de "${link.version.deliverable.title}" (${project.name}). Empresa cliente: ${project.clientOrg.name}.`,
        source: "review-account-request",
        metadata: {
          reviewLinkSlug: slug,
          deliverableId: link.version.deliverableId,
          projectId: project.id,
          clientOrgId: project.clientOrgId,
        },
      },
    })
    .catch((e) => console.error("[request-access] lead save failed", e));

  // Notifica a los miembros de la productora
  const recipients = new Set<string>();
  for (const m of project.producerOrg.members) {
    if (m.user.email) recipients.add(m.user.email);
  }

  if (recipients.size > 0) {
    const dashboardUrl = `${process.env.NEXTAUTH_URL ?? ""}/app/users`;
    await sendEmail({
      to: Array.from(recipients),
      subject: `Solicitud de cuenta: ${name} (${project.clientOrg.name})`,
      html: `<div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:560px;margin:0 auto">
        <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:24px;margin:0 0 12px;color:#fff">Un invitado pide cuenta permanente</h2>
        <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.65)">Proyecto: <strong>${escapeHtml(project.name)}</strong></p>
        <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.65)">Empresa cliente: <strong>${escapeHtml(project.clientOrg.name)}</strong></p>
        <div style="margin:14px 0;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:14px;color:rgba(255,255,255,0.9)">
          <strong>${escapeHtml(name)}</strong><br>
          <a href="mailto:${escapeHtml(email)}" style="color:#E8640C">${escapeHtml(email)}</a>
        </div>
        <p style="margin:0 0 14px;font-size:13px;color:rgba(255,255,255,0.7)">
          Crea su usuario como CLIENT en /app/users — recibirá email de confirmación.
        </p>
        <a href="${dashboardUrl}" style="display:inline-block;background:#E8640C;color:#fff;font-weight:600;font-size:13px;padding:10px 18px;border-radius:9999px;text-decoration:none">Crear usuario →</a>
      </div>`,
    });
  }

  return NextResponse.json({ ok: true });
}
