import { redirect } from "next/navigation";
import { CmsRole, OrgType, ProjectRole, OrgRole, UserKind } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export type AppRole =
  | "MASTER" // Administrador (kind=ADMIN)
  | "PRODUCER" // Productor (kind=PRODUCER)
  | "TEAM" // Equipo audiovisual (kind=TEAM)
  | "CLIENT"; // Cliente (kind=CLIENT)

/**
 * Devuelve el rol "principal" del usuario para decidir UI.
 * Prioridad: User.kind > inferencia desde memberships
 */
export async function getPrimaryAppRole(userId: string, cmsRole: CmsRole): Promise<AppRole> {
  // Si tiene kind explícito, lo usamos
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { kind: true },
  });
  if (u?.kind === UserKind.ADMIN) return "MASTER";
  if (u?.kind === UserKind.PRODUCER) return "PRODUCER";
  if (u?.kind === UserKind.CLIENT) return "CLIENT";
  if (u?.kind === UserKind.TEAM) return "TEAM";

  // Fallback legacy
  if (cmsRole === CmsRole.SUPER_ADMIN) return "MASTER";

  const producer = await prisma.projectMember.findFirst({
    where: {
      userId,
      projectRole: { in: [ProjectRole.PRODUCER, ProjectRole.EXEC_PRODUCER] },
    },
  });
  if (producer) return "PRODUCER";

  const clientOrg = await prisma.orgMember.findFirst({
    where: { userId, org: { type: OrgType.CLIENT } },
  });
  if (clientOrg) return "CLIENT";

  const team = await prisma.projectMember.findFirst({ where: { userId } });
  if (team) return "TEAM";

  return "CLIENT";
}

export async function requireAppUser() {
  const session = await auth();
  if (!session?.user) redirect("/cms/login?next=/app");
  return session.user;
}

export async function requireMaster() {
  const me = await requireAppUser();
  if (me.kind !== UserKind.ADMIN) redirect("/app?denied=1");
  return me;
}

/** Productor o Master — pueden agregar usuarios y gestionar equipo */
export async function requireProducerOrMaster() {
  const me = await requireAppUser();
  if (me.kind !== UserKind.ADMIN && me.kind !== UserKind.PRODUCER) {
    redirect("/app?denied=1");
  }
  return me;
}

export function isMaster(kind: UserKind): boolean {
  return kind === UserKind.ADMIN;
}

/**
 * Tipos de usuario que pueden entrar a la webapp `/app`.
 * Los usuarios exclusivos del CMS (CMS_EDITOR / CMS_REVIEWER) NO entran.
 */
export function canAccessApp(kind: UserKind | null | undefined): boolean {
  return (
    kind === UserKind.ADMIN ||
    kind === UserKind.PRODUCER ||
    kind === UserKind.TEAM ||
    kind === UserKind.CLIENT
  );
}

export function canManageUsers(kind: UserKind): boolean {
  return kind === UserKind.ADMIN || kind === UserKind.PRODUCER;
}

/** Tipos de usuario que el rol actual puede crear */
export function creatableKinds(creatorKind: UserKind): UserKind[] {
  if (creatorKind === UserKind.ADMIN) {
    return [
      UserKind.CMS_EDITOR,
      UserKind.CMS_REVIEWER,
      UserKind.PRODUCER,
      UserKind.TEAM,
      UserKind.CLIENT,
    ];
  }
  if (creatorKind === UserKind.PRODUCER) {
    return [UserKind.TEAM, UserKind.CLIENT];
  }
  return [];
}

export const USER_KIND_LABELS: Record<UserKind, string> = {
  ADMIN: "Administrador",
  CMS_EDITOR: "Editor del CMS",
  CMS_REVIEWER: "Revisor del CMS",
  PRODUCER: "Productor",
  TEAM: "Equipo audiovisual",
  CLIENT: "Cliente",
};

export const USER_KIND_DESCRIPTIONS: Record<UserKind, string> = {
  ADMIN: "Acceso total al CMS y a la webapp",
  CMS_EDITOR: "Solo entra al CMS · puede crear y editar páginas",
  CMS_REVIEWER: "Solo entra al CMS · revisa y aprueba contenido",
  PRODUCER: "Solo webapp · gestiona proyectos y agrega equipo/clientes",
  TEAM: "Solo webapp · ve proyectos donde está asignado",
  CLIENT: "Solo webapp · ve y aprueba sus proyectos",
};

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

/**
 * IDs de los proyectos donde el usuario es miembro directo (su "ámbito" de productor).
 */
async function memberProjectIds(userId: string): Promise<string[]> {
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  return memberships.map((m) => m.projectId);
}

/**
 * Filtro Prisma de los usuarios visibles para un productor:
 * él mismo, miembros de sus proyectos y clientes de las orgs de esos proyectos.
 */
export async function producerScopedUserWhere(meId: string) {
  const projectIds = await memberProjectIds(meId);
  return {
    OR: [
      { id: meId },
      { projectMemberships: { some: { projectId: { in: projectIds } } } },
      {
        orgMemberships: {
          some: { org: { clientProjects: { some: { id: { in: projectIds } } } } },
        },
      },
    ],
  };
}

/** ¿El productor `meId` tiene a `targetId` dentro de su ámbito de gestión? */
export async function producerCanManageUser(
  meId: string,
  targetId: string,
): Promise<boolean> {
  if (targetId === meId) return false;
  const scope = await producerScopedUserWhere(meId);
  const found = await prisma.user.findFirst({
    where: { AND: [{ id: targetId }, scope] },
    select: { id: true },
  });
  return Boolean(found);
}

/** ¿El productor `meId` puede asignar usuarios a la organización `orgId`? */
export async function producerCanUseOrg(
  meId: string,
  orgId: string,
): Promise<boolean> {
  const projectIds = await memberProjectIds(meId);
  if (projectIds.length === 0) return false;
  const proj = await prisma.project.findFirst({
    where: {
      id: { in: projectIds },
      OR: [{ clientOrgId: orgId }, { producerOrgId: orgId }],
    },
    select: { id: true },
  });
  return Boolean(proj);
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
