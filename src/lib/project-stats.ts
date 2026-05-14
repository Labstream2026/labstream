import { DeliverableStatus, type UserKind } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type ProjectStats = {
  deliverablesTotal: number;
  deliverablesApproved: number;
  deliverablesPending: number; // estado != APPROVED
  progressPct: number;          // 0-100
  nextDeliverable: {
    id: string;
    title: string;
    status: DeliverableStatus;
  } | null;
  teamPreview: Array<{
    name: string | null;
    email: string;
    kind: UserKind;
  }>;
  teamCount: number;
};

/**
 * Calcula stats agregadas de un set de proyectos en una sola query (evita N+1).
 * Útil para enriquecer cards en dashboards.
 */
export async function getProjectStatsMap(
  projectIds: string[],
): Promise<Map<string, ProjectStats>> {
  if (projectIds.length === 0) return new Map();

  // Una query por aspecto, en paralelo
  const [deliverables, members] = await Promise.all([
    prisma.deliverable.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        id: true,
        projectId: true,
        title: true,
        status: true,
        updatedAt: true,
      },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.projectMember.findMany({
      where: { projectId: { in: projectIds } },
      select: {
        projectId: true,
        user: { select: { name: true, email: true, kind: true } },
      },
    }),
  ]);

  const map = new Map<string, ProjectStats>();
  for (const id of projectIds) {
    const dvs = deliverables.filter((d) => d.projectId === id);
    const mems = members.filter((m) => m.projectId === id);
    const approved = dvs.filter((d) => d.status === DeliverableStatus.APPROVED).length;
    const pending = dvs.length - approved;
    const next =
      dvs.find((d) => d.status !== DeliverableStatus.APPROVED) ?? null;

    // Equipo preview: deduplica por email, max 5
    const seen = new Set<string>();
    const team: ProjectStats["teamPreview"] = [];
    for (const m of mems) {
      if (seen.has(m.user.email)) continue;
      seen.add(m.user.email);
      team.push({ name: m.user.name, email: m.user.email, kind: m.user.kind });
      if (team.length >= 5) break;
    }

    map.set(id, {
      deliverablesTotal: dvs.length,
      deliverablesApproved: approved,
      deliverablesPending: pending,
      progressPct: dvs.length === 0 ? 0 : Math.round((approved / dvs.length) * 100),
      nextDeliverable: next
        ? { id: next.id, title: next.title, status: next.status }
        : null,
      teamPreview: team,
      teamCount: new Set(mems.map((m) => m.user.email)).size,
    });
  }
  return map;
}
