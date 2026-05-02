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
  STATUS_LABELS,
} from "@/lib/app-guards";
import { sendEmail, escapeHtml } from "@/lib/email";

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

  const v = await prisma.deliverableVersion.create({
    data: {
      deliverableId,
      versionNumber: nextNumber,
      externalUrl,
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
        <DeliverableStatusPill status={deliverable.status} />
      </header>

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

                  {selectedVersion.externalUrl ? (
                    <a
                      href={selectedVersion.externalUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="lg-strong block rounded-xl px-4 py-4 text-[14px] text-white hover:bg-white/[0.09]"
                    >
                      Abrir material ↗
                      <div className="mt-1 truncate text-[11px] text-white/50">
                        {selectedVersion.externalUrl}
                      </div>
                    </a>
                  ) : (
                    <p className="text-[13px] text-white/55">
                      Esta versión no tiene material adjunto.
                    </p>
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
                    <ApprovalActions
                      deliverable={deliverable}
                      version={selectedVersion}
                      canManage={canManage}
                      canClientApprove={canClientApprove}
                      onInternal={approveInternal}
                      onClient={approveAsClient}
                    />
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
                            {c.author.name ?? c.author.email}{" "}
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
                                "{a.comment}"
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
                  placeholder="Link (Drive, Synology, Vimeo…)"
                  className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-[13px] text-white"
                />
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

function DeliverableStatusPill({ status }: { status: DeliverableStatus }) {
  const map: Record<DeliverableStatus, { bg: string; color: string }> = {
    DRAFT: { bg: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.55)" },
    INTERNAL_REVIEW: { bg: "rgba(123,97,255,0.13)", color: "#B6A4FF" },
    CLIENT_REVIEW: { bg: "rgba(232,100,12,0.15)", color: "var(--orange)" },
    CHANGES_REQUESTED: { bg: "rgba(239,68,68,0.13)", color: "#FCA5A5" },
    APPROVED: { bg: "rgba(34,197,94,0.13)", color: "#7DEEA0" },
  };
  const s = map[status];
  return (
    <span
      className="whitespace-nowrap rounded-full px-3 py-1.5 text-[12px] font-medium"
      style={{ background: s.bg, color: s.color }}
    >
      {STATUS_LABELS[status] ?? status}
    </span>
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
