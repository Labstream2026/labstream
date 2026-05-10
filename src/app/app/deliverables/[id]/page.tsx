import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  ApprovalDecision,
  ApprovalStage,
  DeliverableStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  requireAppUser,
  canViewProject,
  canApproveAsClient,
  canApproveInternal,
  DELIVERABLE_KIND_LABELS,
} from "@/lib/app-guards";
import { sendEmail, escapeHtml } from "@/lib/email";
import {
  detectEmbedKind,
  driveFilePreviewIframeUrl,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
  extractVimeoId,
  extractYouTubeId,
  listFolder,
  makeSnapshot,
  diffSnapshots,
  type DriveSnapshot,
} from "@/lib/google-drive";
import { DriveFolderViewer } from "@/components/app/DriveFolderViewer";
import { EmbedKind } from "@prisma/client";
import { ReviewLinksPanel, type ReviewLinkRow } from "@/components/review/ReviewLinksPanel";
import { generateReviewSlug } from "@/lib/review";
import { StatusPill } from "@/components/app/ui/StatusPill";

async function submitVersion(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const externalUrl = String(formData.get("externalUrl") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!externalUrl) return;

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: { versions: { orderBy: { versionNumber: "desc" }, take: 1 } },
  });
  if (!deliverable) return;

  const canManage = await canApproveInternal(
    me.id,
    me.role,
    deliverable.projectId,
  );
  if (!canManage) redirect(`/app/deliverables/${deliverableId}?denied=1`);

  const nextNumber = (deliverable.versions[0]?.versionNumber ?? 0) + 1;
  const detected = detectEmbedKind(externalUrl);

  const v = await prisma.deliverableVersion.create({
    data: {
      deliverableId,
      versionNumber: nextNumber,
      externalUrl,
      embedKind: detected.kind,
      driveFolderId: detected.folderId ?? null,
      driveFileId: detected.fileId ?? null,
      notes,
      submittedById: me.id,
    },
  });

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      currentVersionId: v.id,
      status: DeliverableStatus.INTERNAL_REVIEW,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: deliverable.projectId,
      actorId: me.id,
      type: "VERSION_SUBMITTED",
      summary: `Versión ${nextNumber} enviada para pre-aprobación`,
    },
  });

  revalidatePath(`/app/deliverables/${deliverableId}`);
}

async function approveInternal(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const decision = String(formData.get("decision") ?? "") as ApprovalDecision;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: {
      project: { include: { clientOrg: true, members: { include: { user: true } } } },
    },
  });
  if (!deliverable) return;

  const canManage = await canApproveInternal(
    me.id,
    me.role,
    deliverable.projectId,
  );
  if (!canManage) redirect(`/app/deliverables/${deliverableId}?denied=1`);

  await prisma.approval.create({
    data: {
      deliverableId,
      versionId,
      stage: ApprovalStage.INTERNAL,
      decision,
      comment,
      decidedById: me.id,
    },
  });

  if (decision === ApprovalDecision.APPROVED) {
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: DeliverableStatus.CLIENT_REVIEW },
    });
    await prisma.activityLog.create({
      data: {
        projectId: deliverable.projectId,
        actorId: me.id,
        type: "DELIVERABLE_TO_CLIENT",
        summary: `${deliverable.title} pre-aprobado y enviado al cliente`,
      },
    });

    // Email al cliente lead
    const clientLeads = await prisma.orgMember.findMany({
      where: { orgId: deliverable.project.clientOrgId },
      include: { user: true },
    });
    const recipients = clientLeads.map((c) => c.user.email).filter(Boolean);
    if (recipients.length > 0) {
      await sendEmail({
        to: recipients,
        subject: `Nuevo material para revisar — ${deliverable.project.name}`,
        html: clientNotificationHtml({
          projectName: deliverable.project.name,
          deliverableTitle: deliverable.title,
          link: `${process.env.NEXTAUTH_URL ?? ""}/app/deliverables/${deliverableId}`,
        }),
      });
    }
  } else {
    await prisma.deliverable.update({
      where: { id: deliverableId },
      data: { status: DeliverableStatus.CHANGES_REQUESTED },
    });
    await prisma.activityLog.create({
      data: {
        projectId: deliverable.projectId,
        actorId: me.id,
        type: "INTERNAL_CHANGES_REQUESTED",
        summary: `Pre-aprobación rechazada: se solicitaron cambios internamente`,
      },
    });
  }

  revalidatePath(`/app/deliverables/${deliverableId}`);
  revalidatePath("/app");
}

async function approveAsClient(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const deliverableId = String(formData.get("deliverableId") ?? "");
  const versionId = String(formData.get("versionId") ?? "");
  const decision = String(formData.get("decision") ?? "") as ApprovalDecision;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const deliverable = await prisma.deliverable.findUnique({
    where: { id: deliverableId },
    include: { project: { include: { producerOrg: true } } },
  });
  if (!deliverable) return;

  const canApprove = await canApproveAsClient(me.id, deliverable.projectId);
  if (!canApprove) redirect(`/app/deliverables/${deliverableId}?denied=1`);

  await prisma.approval.create({
    data: {
      deliverableId,
      versionId,
      stage: ApprovalStage.CLIENT,
      decision,
      comment,
      decidedById: me.id,
    },
  });

  await prisma.deliverable.update({
    where: { id: deliverableId },
    data: {
      status:
        decision === ApprovalDecision.APPROVED
          ? DeliverableStatus.APPROVED
          : DeliverableStatus.CHANGES_REQUESTED,
    },
  });

  await prisma.activityLog.create({
    data: {
      projectId: deliverable.projectId,
      actorId: me.id,
      type: decision === ApprovalDecision.APPROVED ? "CLIENT_APPROVED" : "CLIENT_CHANGES_REQUESTED",
      summary:
        decision === ApprovalDecision.APPROVED
          ? `Cliente aprobó "${deliverable.title}"`
          : `Cliente solicitó cambios en "${deliverable.title}"`,
    },
  });

  // Email a la productora
  const producerMembers = await prisma.orgMember.findMany({
    where: { orgId: deliverable.project.producerOrgId },
    include: { user: true },
  });
  const recipients = producerMembers.map((c) => c.user.email).filter(Boolean);
  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject:
        decision === ApprovalDecision.APPROVED
          ? `✓ Cliente aprobó: ${deliverable.title}`
          : `Cambios solicitados: ${deliverable.title}`,
      html: producerNotificationHtml({
        projectName: deliverable.project.name,
        deliverableTitle: deliverable.title,
        decision,
        comment: comment ?? "",
        link: `${process.env.NEXTAUTH_URL ?? ""}/app/deliverables/${deliverableId}`,
      }),
    });
  }

  revalidatePath(`/app/deliverables/${deliverableId}`);
  revalidatePath("/app");
}

async function checkAndNotify(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const versionId = String(formData.get("versionId") ?? "");

  const version = await prisma.deliverableVersion.findUnique({
    where: { id: versionId },
    include: {
      deliverable: {
        include: { project: { include: { clientOrg: true } } },
      },
    },
  });
  if (!version) return;

  const canManage = await canApproveInternal(
    me.id,
    me.role,
    version.deliverable.projectId,
  );
  if (!canManage) return;

  let summary = "Nueva versión disponible para revisar.";
  let hasChanges = false;

  // Si es Drive folder, comparar snapshot
  if (version.driveFolderId) {
    const listing = await listFolder(version.driveFolderId);
    const newSnapshot = makeSnapshot(listing.files);
    const prev = version.driveSnapshotJson as unknown as DriveSnapshot | null;
    const diff = diffSnapshots(prev, newSnapshot);
    hasChanges = diff.hasChanges;

    await prisma.deliverableVersion.update({
      where: { id: versionId },
      data: {
        driveLastCheckedAt: listing.fetchedAt,
        driveFileCount: listing.files.length,
        driveSnapshotJson: newSnapshot as unknown as object,
      },
    });

    if (hasChanges) {
      const parts: string[] = [];
      if (diff.added.length) parts.push(`${diff.added.length} archivo(s) nuevos`);
      if (diff.modified.length)
        parts.push(`${diff.modified.length} archivo(s) modificado(s)`);
      if (diff.removed.length)
        parts.push(`${diff.removed.length} archivo(s) removidos`);
      summary = parts.join(" · ");
    }
  } else {
    // Para no-Drive, asumimos que el productor sabe que hay cambios
    hasChanges = true;
  }

  if (!hasChanges) {
    await prisma.activityLog.create({
      data: {
        projectId: version.deliverable.projectId,
        actorId: me.id,
        type: "DRIVE_NO_CHANGES",
        summary: `Sin cambios detectados en "${version.deliverable.title}"`,
      },
    });
    revalidatePath(`/app/deliverables/${version.deliverableId}`);
    return;
  }

  // Mandar email a la org cliente
  const clientMembers = await prisma.orgMember.findMany({
    where: { orgId: version.deliverable.project.clientOrgId },
    include: { user: true },
  });
  const recipients = clientMembers.map((c) => c.user.email).filter(Boolean);

  if (recipients.length > 0) {
    await sendEmail({
      to: recipients,
      subject: `Nueva versión: ${version.deliverable.title} — ${version.deliverable.project.name}`,
      html: clientNotificationHtml({
        projectName: version.deliverable.project.name,
        deliverableTitle: `${version.deliverable.title} (${summary})`,
        link: `${process.env.NEXTAUTH_URL ?? ""}/app/deliverables/${version.deliverableId}`,
      }),
    });
  }

  await prisma.activityLog.create({
    data: {
      projectId: version.deliverable.projectId,
      actorId: me.id,
      type: "NEW_VERSION_NOTIFIED",
      summary: `Notificación enviada al cliente: ${summary}`,
    },
  });

  revalidatePath(`/app/deliverables/${version.deliverableId}`);
}

async function postComment(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const versionId = String(formData.get("versionId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  const version = await prisma.deliverableVersion.findUnique({
    where: { id: versionId },
    include: { deliverable: true },
  });
  if (!version) return;
  const ok = await canViewProject(me.id, me.role, version.deliverable.projectId);
  if (!ok) return;

  await prisma.comment.create({
    data: { versionId, authorId: me.id, body },
  });

  revalidatePath(`/app/deliverables/${version.deliverableId}`);
}

async function createReviewLink(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const versionId = String(formData.get("versionId") ?? "");
  const title = String(formData.get("title") ?? "").trim() || null;
  const message = String(formData.get("message") ?? "").trim() || null;
  const expiry = String(formData.get("expiry") ?? "never");
  const allowGuests = formData.get("allowGuests") === "on";
  const allowDrawings = formData.get("allowDrawings") === "on";
  const requireGuestEmail = formData.get("requireGuestEmail") === "on";

  const version = await prisma.deliverableVersion.findUnique({
    where: { id: versionId },
    include: { deliverable: true },
  });
  if (!version) return;
  const canManage = await canApproveInternal(me.id, me.role, version.deliverable.projectId);
  if (!canManage) redirect(`/app/deliverables/${version.deliverableId}?denied=1`);

  let expiresAt: Date | null = null;
  const days =
    expiry === "7d" ? 7 : expiry === "30d" ? 30 : expiry === "90d" ? 90 : null;
  if (days) {
    expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  }

  await prisma.reviewLink.create({
    data: {
      slug: generateReviewSlug(),
      deliverableVersionId: versionId,
      title,
      message,
      allowGuests,
      allowDrawings,
      requireGuestEmail,
      expiresAt,
      createdById: me.id,
    },
  });

  await prisma.activityLog
    .create({
      data: {
        projectId: version.deliverable.projectId,
        actorId: me.id,
        type: "REVIEW_LINK_CREATED",
        summary: `Link de revisión creado para "${version.deliverable.title}"`,
      },
    })
    .catch(() => {});

  revalidatePath(`/app/deliverables/${version.deliverableId}`);
}

async function revokeReviewLink(formData: FormData) {
  "use server";
  const me = await requireAppUser();
  const linkId = String(formData.get("linkId") ?? "");

  const link = await prisma.reviewLink.findUnique({
    where: { id: linkId },
    include: { version: { include: { deliverable: true } } },
  });
  if (!link) return;
  const canManage = await canApproveInternal(
    me.id,
    me.role,
    link.version.deliverable.projectId,
  );
  if (!canManage) redirect(`/app/deliverables/${link.version.deliverableId}?denied=1`);

  await prisma.reviewLink.update({
    where: { id: linkId },
    data: { revokedAt: new Date() },
  });

  revalidatePath(`/app/deliverables/${link.version.deliverableId}`);
}

export default async function DeliverableReviewPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ v?: string; denied?: string }>;
}) {
  const me = await requireAppUser();
  const { id } = await props.params;
  const sp = await props.searchParams;

  const deliverable = await prisma.deliverable.findUnique({
    where: { id },
    include: {
      project: { include: { clientOrg: true, producerOrg: true } },
      versions: {
        orderBy: { versionNumber: "desc" },
        include: {
          submittedBy: { select: { name: true, email: true } },
          comments: {
            include: { author: { select: { name: true, email: true } } },
            orderBy: { createdAt: "asc" },
          },
          approvals: {
            include: { decidedBy: { select: { name: true, email: true } } },
            orderBy: { decidedAt: "desc" },
          },
          reviewLinks: {
            orderBy: { createdAt: "desc" },
            include: { _count: { select: { visits: true, comments: true } } },
          },
        },
      },
    },
  });

  if (!deliverable) notFound();

  const canView = await canViewProject(me.id, me.role, deliverable.projectId);
  if (!canView) redirect("/app?denied=1");

  const canManage = await canApproveInternal(me.id, me.role, deliverable.projectId);
  const canClientApprove = await canApproveAsClient(me.id, deliverable.projectId);

  const versions = deliverable.versions;
  const selectedVersionId = sp.v ?? versions[0]?.id;
  const selectedVersion = versions.find((v) => v.id === selectedVersionId) ?? versions[0];

  return (
    <div className="px-5 py-6 md:px-10 md:py-10">
      <div className="mb-4 flex items-center gap-3 text-[13px] text-white/45">
        <Link
          href={`/app/projects/${deliverable.projectId}`}
          className="hover:text-white"
        >
          {deliverable.project.name}
        </Link>
        <span>/</span>
        <span className="text-white/85">{deliverable.title}</span>
      </div>

      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[12px] font-mono tracking-wider text-orange">
            {DELIVERABLE_KIND_LABELS[deliverable.kind] ?? deliverable.kind}
          </div>
          <h1
            className="mt-1 font-heading text-white"
            style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: "-1px" }}
          >
            {deliverable.title}
          </h1>
          {deliverable.description && (
            <p className="mt-2 max-w-2xl text-[13px] text-white/65">
              {deliverable.description}
            </p>
          )}
        </div>
        <StatusPill status={deliverable.status} size="lg" />
      </header>

      {/* Banner sticky de "Tu turno" para CLIENTE cuando aplica */}
      {canClientApprove &&
        deliverable.status === DeliverableStatus.CLIENT_REVIEW &&
        selectedVersion && (
          <div
            className="sticky top-0 z-20 -mx-5 mb-5 border-b px-5 py-3 backdrop-blur md:-mx-10 md:px-10"
            style={{
              borderColor: "rgba(232,100,12,0.4)",
              background: "rgba(20, 12, 4, 0.85)",
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px]">
                <div className="text-[11px] font-mono uppercase tracking-wider text-orange">
                  // Tu turno
                </div>
                <div className="text-[14px] font-semibold text-white">
                  Revisa este material y aprueba o pide cambios
                </div>
              </div>
              <a
                href="#aprobacion"
                className="rounded-full bg-orange px-5 py-2 text-[13px] font-semibold text-white hover:bg-orange/85"
              >
                Ir a aprobar →
              </a>
            </div>
          </div>
        )}

      {sp.denied && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-[13px] text-red-300">
          No tienes permiso para esa acción.
        </div>
      )}

      {versions.length === 0 ? (
        <div className="lg rounded-2xl p-8 text-center text-[14px] text-white/55">
          Aún no hay versiones de este entregable.
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <section className="lg:col-span-2 flex flex-col gap-5">
            {/* Selector de versión */}
            <div className="lg flex flex-wrap items-center gap-2 rounded-2xl p-3">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-white/45">
                Versión
              </span>
              {versions.map((v) => (
                <Link
                  key={v.id}
                  href={`/app/deliverables/${deliverable.id}?v=${v.id}`}
                  className={`rounded-full border px-3 py-1 text-[12px] font-medium ${
                    v.id === selectedVersion?.id
                      ? "border-orange/40 bg-orange/10 text-orange"
                      : "border-white/10 text-white/65 hover:bg-white/5"
                  }`}
                >
                  v{v.versionNumber}
                </Link>
              ))}
            </div>

            {/* Preview de la versión */}
            {selectedVersion && (
              <>
                <div className="lg rounded-2xl p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[11px] uppercase tracking-wider text-white/45">
                        Material v{selectedVersion.versionNumber}
                      </div>
                      <div className="text-[13px] text-white/85">
                        Subido por{" "}
                        {selectedVersion.submittedBy.name ??
                          selectedVersion.submittedBy.email}{" "}
                        ·{" "}
                        {selectedVersion.submittedAt.toLocaleString("es-CO", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>

                  <VersionEmbed version={selectedVersion} />

                  {selectedVersion.externalUrl && (
                    <a
                      href={selectedVersion.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-3 inline-block text-[12px] text-orange hover:underline"
                    >
                      Abrir en {selectedVersion.embedKind?.toString().includes("DRIVE") ? "Google Drive" : "ventana nueva"} ↗
                    </a>
                  )}

                  {selectedVersion.notes && (
                    <div className="mt-4 border-t pt-3" style={{ borderColor: "var(--border)" }}>
                      <div className="text-[11px] uppercase tracking-wider text-white/45">
                        Notas de versión
                      </div>
                      <p className="mt-1 text-[13px] text-white/80">
                        {selectedVersion.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Acciones de aprobación */}
                {selectedVersion.id === versions[0].id &&
                  deliverable.status !== DeliverableStatus.APPROVED && (
                    <div id="aprobacion" className="scroll-mt-32">
                      <ApprovalActions
                        deliverable={deliverable}
                        version={selectedVersion}
                        canManage={canManage}
                        canClientApprove={canClientApprove}
                        onInternal={approveInternal}
                        onClient={approveAsClient}
                      />
                    </div>
                  )}

                {/* Comentarios / notas */}
                <div className="lg rounded-2xl p-5">
                  <h3 className="mb-3 text-[14px] font-semibold text-white">
                    Notas y comentarios
                  </h3>
                  {selectedVersion.comments.length === 0 ? (
                    <p className="mb-4 text-[13px] text-white/45">
                      Aún no hay comentarios en esta versión.
                    </p>
                  ) : (
                    <ul className="mb-4 flex flex-col gap-3">
                      {selectedVersion.comments.map((c) => (
                        <li
                          key={c.id}
                          className="rounded-xl border border-white/5 px-4 py-3"
                        >
                          <div className="text-[12px] font-medium text-white">
                            {c.author
                              ? c.author.name ?? c.author.email
                              : `${c.guestName ?? "Invitado"}`}
                            {!c.author && (
                              <span className="ml-1 text-[10px] font-normal text-orange/85">
                                invitado
                              </span>
                            )}
                            <span className="ml-1 text-[11px] font-normal text-white/40">
                              ·{" "}
                              {c.createdAt.toLocaleString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>
                          <div className="mt-1 text-[13px] text-white/80">
                            {c.body}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                  <form action={postComment} className="flex flex-col gap-2">
                    <input type="hidden" name="versionId" value={selectedVersion.id} />
                    <textarea
                      name="body"
                      required
                      rows={3}
                      placeholder="Escribe una nota o comentario…"
                      className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                    />
                    <button type="submit" className="btn-primary self-start">
                      Publicar
                    </button>
                  </form>
                </div>

                {/* Historial de aprobaciones */}
                {selectedVersion.approvals.length > 0 && (
                  <div className="lg rounded-2xl p-5">
                    <h3 className="mb-3 text-[14px] font-semibold text-white">
                      Decisiones
                    </h3>
                    <ul className="flex flex-col gap-2">
                      {selectedVersion.approvals.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-start justify-between gap-3 border-b py-2 last:border-0"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <div>
                            <div className="text-[12px] font-medium text-white">
                              {a.stage === "INTERNAL"
                                ? "Pre-aprobación interna"
                                : "Aprobación cliente"}{" "}
                              —{" "}
                              <span
                                style={{
                                  color:
                                    a.decision === "APPROVED"
                                      ? "#7DEEA0"
                                      : "#FCA5A5",
                                }}
                              >
                                {a.decision === "APPROVED"
                                  ? "Aprobado"
                                  : "Cambios solicitados"}
                              </span>
                            </div>
                            {a.comment && (
                              <div className="text-[12px] text-white/65">
                                &ldquo;{a.comment}&rdquo;
                              </div>
                            )}
                          </div>
                          <div className="text-[11px] text-white/45 text-right">
                            <div>
                              {a.decidedBy.name ?? a.decidedBy.email}
                            </div>
                            <div>
                              {a.decidedAt.toLocaleString("es-CO", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </section>

          <aside className="flex flex-col gap-4">
            {canManage && selectedVersion && (
              <ReviewLinksPanel
                versionId={selectedVersion.id}
                versionNumber={selectedVersion.versionNumber}
                initialLinks={selectedVersion.reviewLinks.map(
                  (l): ReviewLinkRow => ({
                    id: l.id,
                    slug: l.slug,
                    title: l.title,
                    message: l.message,
                    allowGuests: l.allowGuests,
                    allowDrawings: l.allowDrawings,
                    allowDownload: l.allowDownload,
                    requireGuestEmail: l.requireGuestEmail,
                    expiresAt: l.expiresAt?.toISOString() ?? null,
                    revokedAt: l.revokedAt?.toISOString() ?? null,
                    createdAt: l.createdAt.toISOString(),
                    visitsCount: l._count.visits,
                    commentsCount: l._count.comments,
                  }),
                )}
                onCreate={createReviewLink}
                onRevoke={revokeReviewLink}
              />
            )}

            {canManage && selectedVersion && selectedVersion.driveFolderId && (
              <form
                action={checkAndNotify}
                className="lg flex flex-col gap-2 rounded-2xl p-4"
                style={{
                  border: "1px solid rgba(34,197,94,0.25)",
                  background: "linear-gradient(180deg, rgba(34,197,94,0.05), transparent 80%)",
                }}
              >
                <h3 className="text-[13px] font-semibold text-white">
                  📨 Notificar nueva versión
                </h3>
                <p className="text-[11px] text-white/60">
                  Si subiste cambios al Drive, esto compara y notifica al cliente
                  por email con el resumen de qué cambió.
                </p>
                <input type="hidden" name="versionId" value={selectedVersion.id} />
                <button
                  type="submit"
                  className="rounded-md border border-green-500/30 bg-green-500/10 px-3 py-2 text-[12px] font-medium text-green-300 hover:bg-green-500/20"
                >
                  Verificar Drive y notificar
                </button>
                {selectedVersion.driveLastCheckedAt && (
                  <p className="text-[10px] text-white/40">
                    Última verificación:{" "}
                    {selectedVersion.driveLastCheckedAt.toLocaleString("es-CO")}
                  </p>
                )}
              </form>
            )}

            {canManage && (
              <form
                action={submitVersion}
                className="lg flex flex-col gap-3 rounded-2xl p-5"
              >
                <h3 className="text-[14px] font-semibold text-white">
                  Subir nueva versión
                </h3>
                <input type="hidden" name="deliverableId" value={deliverable.id} />
                <input
                  required
                  name="externalUrl"
                  placeholder="Carpeta Drive · file Drive · Vimeo · YouTube · MP4…"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                />
                <p className="text-[11px] text-white/45">
                  Detección automática del tipo. Carpetas Drive permiten ver
                  galería + descarga selectiva al cliente.
                </p>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="¿Qué cambió en esta versión?"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                />
                <button type="submit" className="btn-primary self-start">
                  Subir v{(versions[0]?.versionNumber ?? 0) + 1}
                </button>
                <p className="text-[11px] text-white/40">
                  Pasará a pre-aprobación interna antes de llegar al cliente.
                </p>
              </form>
            )}

            <div className="lg rounded-2xl p-5">
              <h3 className="mb-2 text-[14px] font-semibold text-white">
                Detalles
              </h3>
              <dl className="text-[13px] text-white/75">
                <div className="flex justify-between border-b py-1.5" style={{ borderColor: "var(--border)" }}>
                  <dt className="text-white/45">Cliente</dt>
                  <dd>{deliverable.project.clientOrg.name}</dd>
                </div>
                <div className="flex justify-between border-b py-1.5" style={{ borderColor: "var(--border)" }}>
                  <dt className="text-white/45">Productora</dt>
                  <dd>{deliverable.project.producerOrg.name}</dd>
                </div>
                <div className="flex justify-between py-1.5">
                  <dt className="text-white/45">Versiones</dt>
                  <dd>{versions.length}</dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function ApprovalActions({
  deliverable,
  version,
  canManage,
  canClientApprove,
  onInternal,
  onClient,
}: {
  deliverable: { id: string; status: DeliverableStatus };
  version: { id: string; versionNumber: number };
  canManage: boolean;
  canClientApprove: boolean;
  onInternal: (formData: FormData) => Promise<void>;
  onClient: (formData: FormData) => Promise<void>;
}) {
  const isInternalStage =
    deliverable.status === DeliverableStatus.INTERNAL_REVIEW ||
    deliverable.status === DeliverableStatus.DRAFT;
  const isClientStage = deliverable.status === DeliverableStatus.CLIENT_REVIEW;

  if (isInternalStage && canManage) {
    return (
      <div
        className="lg rounded-2xl p-5"
        style={{
          border: "1px solid rgba(123,97,255,0.35)",
          background:
            "linear-gradient(180deg, rgba(123,97,255,0.08), transparent 80%)",
        }}
      >
        <h3 className="mb-2 text-[14px] font-semibold text-white">
          Pre-aprobación interna
        </h3>
        <p className="mb-3 text-[12px] text-white/65">
          Como productor, decide si esta versión está lista para enviar al
          cliente.
        </p>
        <form action={onInternal} className="flex flex-col gap-2">
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <input type="hidden" name="versionId" value={version.id} />
          <textarea
            name="comment"
            rows={2}
            placeholder="Comentario opcional"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="submit"
              name="decision"
              value="APPROVED"
              className="flex-1 rounded-full bg-green-500/20 px-4 py-3 text-[14px] font-semibold text-green-300 hover:bg-green-500/30"
            >
              ✓ Aprobar y enviar al cliente
            </button>
            <button
              type="submit"
              name="decision"
              value="CHANGES_REQUESTED"
              className="flex-1 rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[14px] font-medium text-white hover:bg-white/10"
            >
              Solicitar cambios
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (isClientStage && canClientApprove) {
    return (
      <div
        className="lg rounded-2xl p-6"
        style={{
          border: "1px solid rgba(232,100,12,0.4)",
          background:
            "linear-gradient(180deg, rgba(232,100,12,0.1), transparent 80%)",
        }}
      >
        <h3 className="mb-2 font-heading italic text-white" style={{ fontSize: 26 }}>
          Tu turno de revisar
        </h3>
        <p className="mb-4 text-[13px] text-white/75">
          Aprueba si todo está bien o solicita cambios con un comentario.
        </p>
        <form action={onClient} className="flex flex-col gap-2">
          <input type="hidden" name="deliverableId" value={deliverable.id} />
          <input type="hidden" name="versionId" value={version.id} />
          <textarea
            name="comment"
            rows={3}
            placeholder="Comentarios para la productora…"
            className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[14px] text-white"
          />
          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              name="decision"
              value="APPROVED"
              className="flex-1 rounded-full bg-green-500 px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-green-600"
            >
              ✓ Aprobar
            </button>
            <button
              type="submit"
              name="decision"
              value="CHANGES_REQUESTED"
              className="flex-1 rounded-full bg-orange px-5 py-3.5 text-[15px] font-semibold text-white hover:bg-orange/80"
            >
              Solicitar cambios
            </button>
          </div>
        </form>
      </div>
    );
  }

  return null;
}

function VersionEmbed({
  version,
}: {
  version: {
    id: string;
    externalUrl: string | null;
    embedKind: EmbedKind;
    driveFolderId: string | null;
    driveFileId: string | null;
  };
}) {
  if (!version.externalUrl) {
    return (
      <p className="text-[13px] text-white/55">
        Esta versión no tiene material adjunto.
      </p>
    );
  }

  // Carpeta Drive (fotos / videos / mixto)
  if (
    version.driveFolderId &&
    (version.embedKind === EmbedKind.DRIVE_FOLDER_PHOTOS ||
      version.embedKind === EmbedKind.DRIVE_FOLDER_VIDEOS ||
      version.embedKind === EmbedKind.DRIVE_FOLDER_MIXED)
  ) {
    return (
      <DriveFolderViewer
        versionId={version.id}
        folderId={version.driveFolderId}
      />
    );
  }

  // Archivo individual de Drive (video con preview)
  if (version.driveFileId && version.embedKind === EmbedKind.DRIVE_FILE) {
    return (
      <div className="overflow-hidden rounded-2xl">
        <iframe
          src={driveFilePreviewIframeUrl(version.driveFileId)}
          className="aspect-video w-full bg-black"
          allow="autoplay"
          title="Drive video"
        />
      </div>
    );
  }

  // Vimeo
  if (version.embedKind === EmbedKind.VIMEO) {
    const id = extractVimeoId(version.externalUrl);
    if (id) {
      return (
        <div className="overflow-hidden rounded-2xl">
          <iframe
            src={vimeoEmbedUrl(id)}
            className="aspect-video w-full bg-black"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            title="Vimeo"
          />
        </div>
      );
    }
  }

  // YouTube
  if (version.embedKind === EmbedKind.YOUTUBE) {
    const id = extractYouTubeId(version.externalUrl);
    if (id) {
      return (
        <div className="overflow-hidden rounded-2xl">
          <iframe
            src={youtubeEmbedUrl(id)}
            className="aspect-video w-full bg-black"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            title="YouTube"
          />
        </div>
      );
    }
  }

  // Video directo .mp4
  if (version.embedKind === EmbedKind.DIRECT_VIDEO) {
    return (
      <video
        src={version.externalUrl}
        controls
        className="aspect-video w-full rounded-2xl bg-black"
      />
    );
  }

  // Imagen directa
  if (version.embedKind === EmbedKind.IMAGE) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={version.externalUrl}
        alt="Material"
        className="w-full rounded-2xl"
      />
    );
  }

  // Default: link externo plano
  return (
    <a
      href={version.externalUrl}
      target="_blank"
      rel="noreferrer"
      className="lg-strong block rounded-xl px-4 py-4 text-[14px] text-white hover:bg-white/[0.09]"
    >
      Abrir material ↗
      <div className="mt-1 truncate text-[11px] text-white/50">
        {version.externalUrl}
      </div>
    </a>
  );
}

function clientNotificationHtml(args: {
  projectName: string;
  deliverableTitle: string;
  link: string;
}): string {
  return `<div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:560px;margin:0 auto">
    <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:26px;margin:0 0 16px;color:#fff">Nuevo material para revisar</h2>
    <p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.75)">Tienes un nuevo entregable pendiente de aprobación en <strong>${escapeHtml(args.projectName)}</strong>.</p>
    <p style="margin:0 0 20px;font-size:14px;color:rgba(255,255,255,0.85)"><strong>${escapeHtml(args.deliverableTitle)}</strong></p>
    <a href="${args.link}" style="display:inline-block;background:#E8640C;color:#fff;font-weight:600;font-size:14px;padding:12px 22px;border-radius:9999px;text-decoration:none">Revisar ahora →</a>
    <p style="margin-top:24px;font-size:11px;color:rgba(255,255,255,0.4)">Labstream Studio · Panel de proyectos</p>
  </div>`;
}

function producerNotificationHtml(args: {
  projectName: string;
  deliverableTitle: string;
  decision: ApprovalDecision;
  comment: string;
  link: string;
}): string {
  const approved = args.decision === ApprovalDecision.APPROVED;
  return `<div style="font-family:Figtree,Arial,sans-serif;background:#0f0f0f;color:#f0f0ee;padding:24px;border-radius:12px;max-width:560px;margin:0 auto">
    <h2 style="font-family:'Instrument Serif',serif;font-style:italic;font-size:26px;margin:0 0 16px;color:${approved ? "#7DEEA0" : "#E8640C"}">${approved ? "Cliente aprobó" : "Cambios solicitados"}</h2>
    <p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.75)">Proyecto: <strong>${escapeHtml(args.projectName)}</strong></p>
    <p style="margin:0 0 12px;font-size:14px;color:rgba(255,255,255,0.85)">Entregable: <strong>${escapeHtml(args.deliverableTitle)}</strong></p>
    ${args.comment ? `<div style="margin:16px 0;padding:14px 16px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;font-size:14px;color:rgba(255,255,255,0.85);white-space:pre-wrap">${escapeHtml(args.comment)}</div>` : ""}
    <a href="${args.link}" style="display:inline-block;background:#E8640C;color:#fff;font-weight:600;font-size:14px;padding:12px 22px;border-radius:9999px;text-decoration:none">Ver detalle →</a>
  </div>`;
}
