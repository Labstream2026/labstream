import { redirect } from "next/navigation";
import { CmsRole, OrgType, ProjectRole, OrgRole } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AppRole =
  | "MASTER" // Super Admin
  | "PRODUCER" // Productor o productora ejecutiva en algún proyecto
  | "TEAM" // Director, editor, DOP, etc.
  | "CLIENT"; // Cliente (lead o viewer)

/**
 * Devuelve el rol "principal" del usuario para decidir UI.
 * - MASTER si es SUPER_ADMIN
 * - sino se infiere del primer ProjectMember encontrado
 * - sino del OrgMember en una org tipo CLIENT
 */
export async function getPrimaryAppRole(userId: string, cmsRole: CmsRole): Promise<AppRole> {
  if (cmsRole === CmsRole.SUPER_ADMIN) return "MASTER";

  // ¿Es productor en algún proyecto?
  const producer = await prisma.projectMember.findFirst({
    where: {
      userId,
      projectRole: { in: [ProjectRole.PRODUCER, ProjectRole.EXEC_PRODUCER] },
    },
  });
  if (producer) return "PRODUCER";

  // ¿Pertenece a una org cliente?
  const clientOrg = await prisma.orgMember.findFirst({
    where: {
      userId,
      org: { type: OrgType.CLIENT },
    },
  });
  if (clientOrg) return "CLIENT";

  // ¿Está en algún proyecto como equipo?
  const team = await prisma.projectMember.findFirst({ where: { userId } });
  if (team) return "TEAM";

  // Sin proyectos: por defecto MASTER si es admin del CMS, sino CLIENT como fallback amigable
  return "CLIENT";
}

export async function requireAppUser() {
  const session = await auth();
  if (!session?.user) redirect("/cms/login?next=/app");
  return session.user;
}

export async function requireMaster() {
  const me = await requireAppUser();
  if (me.role !== CmsRole.SUPER_ADMIN) redirect("/app?denied=1");
  return me;
}

/** ¿El usuario tiene visibilidad sobre este proyecto? */
export async function canViewProject(
  userId: string,
  cmsRole: CmsRole,
  projectId: string,
): Promise<boolean> {
  if (cmsRole === CmsRole.SUPER_ADMIN) return true;

  const directMember = await prisma.projectMember.findFirst({
    where: { userId, projectId },
    select: { id: true },
  });
  if (directMember) return true;

  // Acceso vía org cliente o productora
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientOrgId: true, producerOrgId: true },
  });
  if (!project) return false;

  const orgMember = await prisma.orgMember.findFirst({
    where: {
      userId,
      orgId: { in: [project.clientOrgId, project.producerOrgId] },
    },
    select: { id: true },
  });
  return Boolean(orgMember);
}

export async function requireProjectViewer(projectId: string) {
  const me = await requireAppUser();
  const ok = await canViewProject(me.id, me.role, projectId);
  if (!ok) redirect("/app?denied=1");
  return me;
}

/** ¿El usuario puede gestionar el proyecto (asignar miembros, crear entregables)? */
export async function canManageProject(
  userId: string,
  cmsRole: CmsRole,
  projectId: string,
): Promise<boolean> {
  if (cmsRole === CmsRole.SUPER_ADMIN) return true;

  const member = await prisma.projectMember.findFirst({
    where: {
      userId,
      projectId,
      projectRole: { in: [ProjectRole.PRODUCER, ProjectRole.EXEC_PRODUCER] },
    },
  });
  return Boolean(member);
}

export async function requireProjectManager(projectId: string) {
  const me = await requireAppUser();
  const ok = await canManageProject(me.id, me.role, projectId);
  if (!ok) redirect(`/app/projects/${projectId}?denied=1`);
  return me;
}

/** ¿Es cliente con poder de aprobar (CLIENT_LEAD u OWNER de la org cliente)? */
export async function canApproveAsClient(
  userId: string,
  projectId: string,
): Promise<boolean> {
  // Tiene rol CLIENT_LEAD asignado
  const lead = await prisma.projectMember.findFirst({
    where: { userId, projectId, projectRole: ProjectRole.CLIENT_LEAD },
  });
  if (lead) return true;

  // O es OWNER de la org cliente del proyecto
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { clientOrgId: true },
  });
  if (!project) return false;
  const owner = await prisma.orgMember.findFirst({
    where: {
      userId,
      orgId: project.clientOrgId,
      orgRole: OrgRole.OWNER,
    },
  });
  return Boolean(owner);
}

/** ¿Pertenece a la org productora del proyecto y puede pre-aprobar internamente? */
export async function canApproveInternal(
  userId: string,
  cmsRole: CmsRole,
  projectId: string,
): Promise<boolean> {
  if (cmsRole === CmsRole.SUPER_ADMIN) return true;
  return canManageProject(userId, cmsRole, projectId);
}

/** Lista los IDs de proyectos visibles para el usuario. */
export async function listVisibleProjectIds(
  userId: string,
  cmsRole: CmsRole,
): Promise<{ all: true } | { all: false; ids: string[] }> {
  if (cmsRole === CmsRole.SUPER_ADMIN) return { all: true };

  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const direct = new Set(memberships.map((m) => m.projectId));

  const orgs = await prisma.orgMember.findMany({
    where: { userId },
    select: { orgId: true },
  });
  const orgIds = orgs.map((o) => o.orgId);

  if (orgIds.length > 0) {
    const orgProjects = await prisma.project.findMany({
      where: {
        OR: [
          { clientOrgId: { in: orgIds } },
          { producerOrgId: { in: orgIds } },
        ],
      },
      select: { id: true },
    });
    for (const p of orgProjects) direct.add(p.id);
  }

  return { all: false, ids: Array.from(direct) };
}

export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  EXEC_PRODUCER: "Productor ejecutivo",
  PRODUCER: "Productor",
  DIRECTOR: "Director",
  DOP: "Director de fotografía",
  CAMERA: "Cámara",
  PHOTOGRAPHER: "Fotógrafo",
  EDITOR: "Editor",
  COLORIST: "Colorista",
  SOUND: "Sonido",
  VFX: "VFX",
  AI_ARTIST: "AI Artist",
  ART_DIRECTOR: "Director de arte",
  PRODUCTION_ASSISTANT: "Asistente de producción",
  CLIENT_LEAD: "Cliente — aprobador",
  CLIENT_VIEWER: "Cliente — observador",
  OTHER: "Otro",
};

export const PHASE_LABELS: Record<string, string> = {
  BRIEF: "Brief",
  PROPOSAL: "Propuesta",
  PRE: "Pre-producción",
  PRODUCTION: "Producción",
  POST: "Post-producción",
  DELIVERY: "Entrega",
  CUSTOM: "Personalizada",
};

export const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activo",
  ON_HOLD: "En pausa",
  COMPLETED: "Completado",
  CANCELLED: "Cancelado",

  PENDING: "Pendiente",
  TODO: "Por hacer",
  DOING: "En curso",
  REVIEW: "Revisión",
  DONE: "Listo",
  BLOCKED: "Bloqueado",

  INTERNAL_REVIEW: "Revisión interna",
  CLIENT_REVIEW: "Esperando cliente",
  CHANGES_REQUESTED: "Cambios solicitados",
  APPROVED: "Aprobado",
};

export const DELIVERABLE_KIND_LABELS: Record<string, string> = {
  TREATMENT: "Tratamiento",
  SCRIPT: "Guion",
  STORYBOARD: "Storyboard",
  CASTING: "Casting",
  LOCATION: "Locación",
  PPM: "PPM",
  ROUGH_CUT: "Rough cut",
  FINE_CUT: "Fine cut",
  PICTURE_LOCK: "Picture lock",
  COLOR: "Color",
  SOUND_MIX: "Mezcla de audio",
  MASTER: "Master final",
  PHOTOSET: "Set de fotos",
  STREAM_RECORDING: "Grabación stream",
  OTHER: "Otro",
};
