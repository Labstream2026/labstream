import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { isReviewLinkActive, isValidAnnotation } from "@/lib/review";
import { sendEmail, escapeHtml } from "@/lib/email";

const annotationsSchema = z.array(z.unknown()).max(50);

const createSchema = z.object({
  body: z.string().min(1).max(4000),
  videoTimeMs: z.number().int().min(0).optional(),
  parentId: z.string().optional(),
  guestName: z.string().min(1).max(80).optional(),
  guestEmail: z.string().email().max(160).optional(),
  frameAssetId: z.string().optional(),
  annotations: annotationsSchema.optional(),
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
                  members: { include: { user: true } },
                  clientOrg: { include: { members: { include: { user: true } } } },
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
  const active = isReviewLinkActive(link);
  if (!active.active) return NextResponse.json({ error: "gone" }, { status: 410 });

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", details: parsed.error.format() }, { status: 400 });
  }
  const data = parsed.data;

  // Determina autor: usuario logueado o invitado
  const session = await auth();
  let authorId: string | null = null;
  let guestName: string | null = null;
  let guestEmail: string | null = null;
  let displayName = "";

  if (session?.user?.id) {
    authorId = session.user.id;
    displayName = session.user.name ?? session.user.email ?? "Usuario";
  } else {
    if (!link.allowGuests) {
      return NextResponse.json({ error: "guests_not_allowed" }, { status: 403 });
    }
    if (!data.guestName) {
      return NextResponse.json({ error: "name_required" }, { status: 400 });
    }
    if (link.requireGuestEmail && !data.guestEmail) {
      return NextResponse.json({ error: "email_required" }, { status: 400 });
    }
    guestName = data.guestName;
    guestEmail = data.guestEmail ?? null;
    displayName = guestName + " (invitado)";
  }

  // Validar annotations
  const annotations =
    data.annotations && data.annotations.every(isValidAnnotation)
      ? data.annotations
      : null;

  if (annotations && !link.allowDrawings) {
    return NextResponse.json({ error: "drawings_not_allowed" }, { status: 403 });
  }

  // Validar parentId si se manda — debe ser un comentario de la misma versión
  let parent: { id: string; authorId: string | null; guestEmail: string | null } | null = null;
  if (data.parentId) {
    parent = await prisma.comment.findFirst({
      where: { id: data.parentId, versionId: link.deliverableVersionId },
      select: { id: true, authorId: true, guestEmail: true },
    });
    if (!parent) {
      return NextResponse.json({ error: "parent_not_found" }, { status: 400 });
    }
  }

  const created = await prisma.comment.create({
    data: {
      versionId: link.deliverableVersionId,
      authorId,
      guestName,
      guestEmail,
      body: data.body,
      videoTimeMs: data.videoTimeMs ?? null,
      timecodeSeconds:
        data.videoTimeMs != null ? Math.floor(data.videoTimeMs / 1000) : null,
      frameAssetId: data.frameAssetId ?? null,
      annotationsJson: annotations ?? undefined,
      parentId: data.parentId ?? null,
      reviewLinkId: link.id,
    },
    include: {
      author: { select: { name: true, email: true } },
      frameAsset: { select: { id: true, url: true } },
    },
  });

  // Activity log
  await prisma.activityLog
    .create({
      data: {
        projectId: link.version.deliverable.projectId,
        actorId: authorId,
        type: parent ? "REVIEW_REPLY" : "REVIEW_COMMENT",
        summary: parent
          ? `${displayName} respondió en "${link.version.deliverable.title}"`
          : `${displayName} comentó en "${link.version.deliverable.title}"`,
      },
    })
    .catch(() => {});

  // Notificaciones por email — best effort
  void notify(link, created, displayName, parent).catch((e) => {
    console.error("[review/comments] notify failed", e);
  });

  return NextResponse.json({
    ok: true,
    comment: serializeComment(created, displayName),
  });
}

// Tipo derivado de la query principal del POST handler para tipar `notify()`.
type LinkWithProject = NonNullable<
  Awaited<ReturnType<typeof prisma.reviewLink.findUnique<{
    where: { slug: string };
    include: {
      version: {
        include: {
          deliverable: {
            include: {
              project: {
                include: {
                  members: { include: { user: true } };
                  clientOrg: { include: { members: { include: { user: true } } } };
                  producerOrg: { include: { members: { include: { user: true } } } };
                };
              };
            };
          };
        };
      };
    };
  }>>>
>;

async function notify(
  link: LinkWithProject,
  comment: { body: string; videoTimeMs: number | null; createdAt: Date },
  displayName: string,
  parent: { authorId: string | null; guestEmail: string | null } | null,
) {
  const project = link.version.deliverable.project;
  const deliverableTitle = link.version.deliverable.title;
  const reviewUrl = `${process.env.NEXTAUTH_URL ?? ""}/review/${link.slug}`;
  const tcLine =
    comment.videoTimeMs != null
      ? `<p style="margin:0 0 8px;font-size:12px;color:rgba(255,255,255,0.55)">@ ${formatTc(comment.videoTimeMs)}</p>`
      : "";

  const html = `<div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:560px;margin:0 auto">
    <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:24px;margin:0 0 12px;color:#fff">${parent ? "Nueva respuesta" : "Nuevo comentario"} en revisión</h2>
    <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.65)">${escapeHtml(project.name)} · <strong>${escapeHtml(deliverableTitle)}</strong></p>
    <p style="margin:0 0 6px;font-size:13px;color:rgba(255,255,255,0.85)">De: <strong>${escapeHtml(displayName)}</strong></p>
    ${tcLine}
    <div style="margin:14px 0;white-space:pre-wrap;font-size:14px;line-height:1.55;color:rgba(255,255,255,0.9);background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;padding:14px 16px">${escapeHtml(comment.body)}</div>
    <a href="${reviewUrl}" style="display:inline-block;background:#E8640C;color:#fff;font-weight:600;font-size:14px;padding:11px 20px;border-radius:9999px;text-decoration:none">Abrir revisión →</a>
  </div>`;

  // Comentario raíz (no es reply): notifica a producer org + project members con rol creativo
  if (!parent) {
    const recipients = new Set<string>();
    for (const m of project.producerOrg.members) {
      if (m.user.email) recipients.add(m.user.email);
    }
    for (const m of project.members) {
      if (m.user.email) recipients.add(m.user.email);
    }
    if (recipients.size > 0) {
      await sendEmail({
        to: Array.from(recipients),
        subject: `Comentario nuevo: ${deliverableTitle}`,
        html,
      });
    }
    return;
  }

  // Reply: notifica al autor del comentario padre
  const recipients = new Set<string>();
  if (parent.authorId) {
    const u = await prisma.user.findUnique({
      where: { id: parent.authorId },
      select: { email: true },
    });
    if (u?.email) recipients.add(u.email);
  }
  if (parent.guestEmail) recipients.add(parent.guestEmail);

  // También a los miembros de la org cliente (para que vean cierre del loop)
  for (const m of project.clientOrg.members) {
    if (m.user.email) recipients.add(m.user.email);
  }

  if (recipients.size > 0) {
    await sendEmail({
      to: Array.from(recipients),
      subject: `Respuesta del equipo: ${deliverableTitle}`,
      html,
    });
  }
}

function formatTc(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

type CommentWithAuthor = {
  id: string;
  body: string;
  videoTimeMs: number | null;
  createdAt: Date;
  authorId: string | null;
  guestName: string | null;
  parentId: string | null;
  resolved: boolean;
  annotationsJson: unknown;
  author: { name: string | null; email: string } | null;
  frameAsset: { id: string; url: string } | null;
};

function serializeComment(c: CommentWithAuthor, displayName: string) {
  return {
    id: c.id,
    body: c.body,
    videoTimeMs: c.videoTimeMs,
    createdAt: c.createdAt.toISOString(),
    parentId: c.parentId,
    resolved: c.resolved,
    isGuest: !c.authorId,
    displayName,
    annotations: c.annotationsJson ?? null,
    frame: c.frameAsset ? { id: c.frameAsset.id, url: c.frameAsset.url } : null,
  };
}

// PATCH — resolve / unresolve. Solo usuarios logueados que pueden ver el proyecto.
const patchSchema = z.object({
  commentId: z.string(),
  resolved: z.boolean(),
});

export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "auth_required" }, { status: 401 });
  }

  const link = await prisma.reviewLink.findUnique({ where: { slug } });
  if (!link) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const comment = await prisma.comment.findFirst({
    where: { id: parsed.data.commentId, versionId: link.deliverableVersionId },
  });
  if (!comment) return NextResponse.json({ error: "not_found" }, { status: 404 });

  await prisma.comment.update({
    where: { id: comment.id },
    data: {
      resolved: parsed.data.resolved,
      resolvedAt: parsed.data.resolved ? new Date() : null,
      resolvedById: parsed.data.resolved ? session.user.id : null,
    },
  });

  return NextResponse.json({ ok: true });
}
