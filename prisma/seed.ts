import {
  PrismaClient,
  CmsRole,
  UserKind,
  PageStatus,
  OrgType,
  OrgRole,
  ProjectStatus,
  ProjectRole,
  PhaseType,
  PhaseStatus,

  DeliverableKind,
  DeliverableStatus,
  ApprovalStage,
  ApprovalDecision,
  EmbedKind,
  AssetSource,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  await seedCms();
  await seedWebapp();
  console.log("\n✔ Seed completo");
}

async function seedCms() {
  const adminEmail = "admin@labstream.local";
  const adminPassword = "Labstream2026!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { kind: UserKind.ADMIN },
    create: {
      email: adminEmail,
      name: "Administrador",
      passwordHash,
      role: CmsRole.SUPER_ADMIN,
      kind: UserKind.ADMIN,
      active: true,
    },
  });

  await prisma.siteSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      siteName: "Labstream Studio",
      tagline: "Casa productora audiovisual",
      contactEmail: "hola@labstream.studio",
      socials: { instagram: "", vimeo: "", youtube: "", linkedin: "" },
    },
  });

  const home = await prisma.page.upsert({
    where: { slug: "home" },
    update: {},
    create: {
      slug: "home",
      title: "Inicio",
      description: "Página principal de Labstream Studio",
      status: PageStatus.PUBLISHED,
      isHome: true,
      order: 0,
      publishedAt: new Date(),
      metaTitle: "Labstream Studio — Casa productora audiovisual",
      metaDesc:
        "Producción audiovisual de vanguardia, fusionada con inteligencia artificial.",
      updatedById: admin.id,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: home.id } });
  await prisma.block.createMany({
    data: [
      {
        pageId: home.id,
        type: "hero",
        order: 0,
        data: {
          eyebrow: "Showreel 2026 · Producción potenciada por IA",
          title: "Narrativa que viaja más allá del ojo",
          subtitle:
            "Producción audiovisual de vanguardia, fusionada con inteligencia artificial. Imágenes que definen marcas — extraordinarias y precisas.",
          ctaLabel: "Empieza tu proyecto",
          ctaHref: "/#contact",
          secondaryLabel: "Ver Showreel",
          secondaryHref: "#",
          backgroundImage:
            "/media/hero-cinema.jpg",
          backgroundVideo: "",
          overlayOpacity: 65,
        },
        updatedById: admin.id,
      },
      {
        pageId: home.id,
        type: "stats",
        order: 1,
        data: {
          items: [
            { value: "12+", label: "Años en producción audiovisual" },
            { value: "340", label: "Proyectos entregados globalmente" },
          ],
        },
        updatedById: admin.id,
      },
      {
        pageId: home.id,
        type: "carousel",
        order: 2,
        data: {
          eyebrow: "Trabajos seleccionados",
          heading: "Algunos proyectos recientes",
          slides: [
            {
              url: "/media/set-produccion.jpg",
              alt: "Producción audiovisual",
              caption: "Comercial · Marca global · 2025",
            },
            {
              url: "/media/editorial.jpg",
              alt: "Sesión de fotografía",
              caption: "Editorial de marca · 2025",
            },
            {
              url: "/media/streaming.jpg",
              alt: "Streaming en vivo",
              caption: "Evento corporativo · multicámara · 2024",
            },
            {
              url: "/media/location.jpg",
              alt: "Locación cinematográfica",
              caption: "Documental · 2024",
            },
          ],
          autoplay: true,
          intervalSeconds: 5,
          loop: true,
          indicators: true,
          aspectRatio: "21/9",
        },
        updatedById: admin.id,
      },
      {
        pageId: home.id,
        type: "featureList",
        order: 3,
        data: {
          eyebrow: "Capacidades",
          heading: "Producción reinventada",
          items: [
            {
              icon: "🎬",
              title: "Cinema premium",
              desc: "Equipos de gama alta, dirección con criterio.",
            },
            {
              icon: "⚡",
              title: "Tiempos rápidos",
              desc: "De la idea al máster sin perder calidad.",
            },
            {
              icon: "🤖",
              title: "IA aplicada",
              desc: "Voz, imagen, edición potenciadas por IA.",
            },
            {
              icon: "🌐",
              title: "Multiplataforma",
              desc: "Cortes optimizados para cada canal.",
            },
          ],
          columns: 4,
        },
        updatedById: admin.id,
      },
    ],
  });

  // ─── Pre-cargar assets en la biblioteca para que el usuario los reemplace fácil ────
  await prisma.asset.deleteMany({
    where: { source: AssetSource.URL, url: { contains: "unsplash.com" } },
  });
  await prisma.asset.createMany({
    data: [
      {
        source: AssetSource.URL,
        url: "/media/hero-cinema.jpg",
        thumbnailUrl: "/media/hero-cinema.jpg",
        filename: "Hero · Cámara cinema",
        alt: "Cámara cinematográfica en set",
        storage: "external",
        uploadedById: admin.id,
      },
      {
        source: AssetSource.URL,
        url: "/media/set-produccion.jpg",
        thumbnailUrl: "/media/set-produccion.jpg",
        filename: "Producción · Marca global",
        alt: "Producción audiovisual en set",
        storage: "external",
        uploadedById: admin.id,
      },
      {
        source: AssetSource.URL,
        url: "/media/editorial.jpg",
        thumbnailUrl: "/media/editorial.jpg",
        filename: "Editorial · Sesión fotográfica",
        alt: "Sesión de fotografía editorial",
        storage: "external",
        uploadedById: admin.id,
      },
      {
        source: AssetSource.URL,
        url: "/media/streaming.jpg",
        thumbnailUrl: "/media/streaming.jpg",
        filename: "Streaming · Multicámara",
        alt: "Setup de streaming multicámara",
        storage: "external",
        uploadedById: admin.id,
      },
      {
        source: AssetSource.URL,
        url: "/media/location.jpg",
        thumbnailUrl: "/media/location.jpg",
        filename: "Documental · Locación",
        alt: "Locación cinematográfica",
        storage: "external",
        uploadedById: admin.id,
      },
      {
        source: AssetSource.URL,
        url: "/media/color-grading.jpg",
        thumbnailUrl: "/media/color-grading.jpg",
        filename: "Post-producción · Color",
        alt: "Estación de color grading",
        storage: "external",
        uploadedById: admin.id,
      },
    ],
  });

  const servicePage = await prisma.page.upsert({
    where: { slug: "servicio" },
    update: {},
    create: {
      slug: "servicio",
      title: "Servicios",
      description: "Servicios audiovisuales de Labstream",
      status: PageStatus.PUBLISHED,
      isHome: false,
      order: 1,
      publishedAt: new Date(),
      metaTitle: "Servicios — Labstream Studio",
      metaDesc:
        "Producción audiovisual integral: conceptualización, dirección, post-producción y entrega multiplataforma.",
      updatedById: admin.id,
    },
  });

  await prisma.block.deleteMany({ where: { pageId: servicePage.id } });
  await prisma.block.createMany({
    data: [
      {
        pageId: servicePage.id,
        type: "hero",
        order: 0,
        data: {
          eyebrow: "Servicios",
          title: "Producción audiovisual end-to-end.",
          subtitle:
            "Desde la chispa creativa hasta el master final. Equipos, talento y procesos para historias de alto impacto.",
        },
        updatedById: admin.id,
      },
    ],
  });

  await prisma.service.deleteMany();
  await prisma.service.createMany({
    data: [
      {
        slug: "produccion-audiovisual",
        title: "Producción Audiovisual",
        summary:
          "Spots, documentales, branded content y videoclips con equipo cinema de gama alta.",
        content: "Spots,Documentales,Branded,Videoclips",
        order: 0,
      },
      {
        slug: "fotografia",
        title: "Fotografía",
        summary:
          "Fotografía de marca, producto y editorial. Luz, composición y dirección de arte en cada disparo.",
        content: "Producto,Editorial,Marca,Campaña",
        order: 1,
      },
      {
        slug: "contenido-redes",
        title: "Contenido para Redes",
        summary:
          "Reels, Stories y TikToks nativos para cada plataforma. Estrategia + producción en volumen.",
        content: "Reels,TikTok,Shorts,Stories",
        order: 2,
      },
      {
        slug: "ia-contenido",
        title: "IA Aplicada al Contenido",
        summary:
          "Integración de IA en guión, edición automática, voiceover sintético y generación de conceptos.",
        content: "Generativo,Voiceover IA,Auto-edit,Concept",
        order: 3,
      },
      {
        slug: "livestreaming",
        title: "Livestreaming",
        summary:
          "Transmisiones en vivo broadcast para eventos corporativos, conciertos y conferencias.",
        content: "Multicámara,Multicanal,Broadcast,Real-time",
        order: 4,
      },
      {
        slug: "post-produccion",
        title: "Post-producción",
        summary:
          "Edición, color grading, motion graphics y diseño sonoro. El acabado final lo cambia todo.",
        content: "Edición,Color,Motion,Audio",
        order: 5,
      },
    ],
  });

  await prisma.menuItem.deleteMany();
  await prisma.menuItem.createMany({
    data: [
      { label: "Inicio", href: "/#home", location: "header", order: 0 },
      { label: "Portafolio", href: "/#portfolio", location: "header", order: 1 },
      { label: "Servicios", href: "/#services", location: "header", order: 2 },
      { label: "Proceso", href: "/#process", location: "header", order: 3 },
      { label: "Contacto", href: "/#contact", location: "header", order: 4 },
    ],
  });

  console.log("CMS:");
  console.log(`  Super Admin: ${adminEmail} / ${adminPassword}`);
}

async function makeUser(opts: {
  email: string;
  name: string;
  cmsRole?: CmsRole;
  kind?: UserKind;
}) {
  const passwordHash = await bcrypt.hash("Demo2026!", 12);
  return prisma.user.upsert({
    where: { email: opts.email },
    update: { kind: opts.kind ?? UserKind.TEAM },
    create: {
      email: opts.email,
      name: opts.name,
      passwordHash,
      role: opts.cmsRole ?? CmsRole.EDITOR,
      kind: opts.kind ?? UserKind.TEAM,
      active: true,
    },
  });
}

async function seedWebapp() {
  // ─── Limpia datos webapp para que el seed sea idempotente ────
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.approval.deleteMany();
  // Romper FK del current version antes de borrar versiones
  await prisma.deliverable.updateMany({ data: { currentVersionId: null } });
  await prisma.deliverableVersion.deleteMany();
  await prisma.deliverable.deleteMany();
  await prisma.taskAssignee.deleteMany();
  await prisma.task.deleteMany();
  await prisma.phase.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.templateTask.deleteMany();
  await prisma.templatePhase.deleteMany();
  await prisma.projectTemplate.deleteMany();
  await prisma.orgMember.deleteMany();
  await prisma.organization.deleteMany();

  // ─── Master ya existe (admin@labstream.local) ────
  const master = await prisma.user.findUnique({
    where: { email: "admin@labstream.local" },
  });
  if (!master) throw new Error("Super admin debe existir antes");

  // ─── Equipo interno ────
  const lucia = await makeUser({ email: "lucia@labstream.local", name: "Lucía Pérez", kind: UserKind.PRODUCER });
  const carlos = await makeUser({ email: "carlos@labstream.local", name: "Carlos Ruiz", kind: UserKind.TEAM });
  const ana = await makeUser({ email: "ana@labstream.local", name: "Ana Torres", kind: UserKind.TEAM });
  const javier = await makeUser({ email: "javier@labstream.local", name: "Javier Mora", kind: UserKind.TEAM });

  // ─── Productoras externas ────
  const sofia = await makeUser({ email: "sofia@productoranorte.com", name: "Sofía Ramírez", kind: UserKind.PRODUCER });
  const diego = await makeUser({ email: "diego@productoranorte.com", name: "Diego Castaño", kind: UserKind.TEAM });

  // ─── Cliente PepsiCo ────
  const brand1 = await makeUser({ email: "marta@pepsico.com", name: "Marta Salinas", kind: UserKind.CLIENT });
  const brand2 = await makeUser({ email: "ricardo@pepsico.com", name: "Ricardo Ortiz", kind: UserKind.CLIENT });

  // ─── Cliente otra empresa (para demo de variedad) ────
  const brand3 = await makeUser({ email: "elena@bavaria.co", name: "Elena Marín", kind: UserKind.CLIENT });

  // ─── Organizations ────
  const labstream = await prisma.organization.create({
    data: {
      name: "Labstream Studio",
      type: OrgType.INTERNAL,
      website: "https://labstream.studio",
    },
  });

  const productoraNorte = await prisma.organization.create({
    data: {
      name: "Productora Norte",
      type: OrgType.PRODUCER,
      website: "https://productoranorte.com",
      notes: "Productora aliada para proyectos en LATAM Norte",
    },
  });

  const pepsico = await prisma.organization.create({
    data: {
      name: "PepsiCo",
      type: OrgType.CLIENT,
      website: "https://pepsico.com",
      notes: "Cliente global · contacto principal: Marta Salinas",
    },
  });

  const bavaria = await prisma.organization.create({
    data: {
      name: "Bavaria",
      type: OrgType.CLIENT,
      website: "https://bavaria.co",
    },
  });

  // ─── Org memberships ────
  await prisma.orgMember.createMany({
    data: [
      { orgId: labstream.id, userId: master.id, orgRole: OrgRole.OWNER, title: "Founder" },
      { orgId: labstream.id, userId: lucia.id, orgRole: OrgRole.MEMBER, title: "Productora ejecutiva" },
      { orgId: labstream.id, userId: carlos.id, orgRole: OrgRole.MEMBER, title: "Director" },
      { orgId: labstream.id, userId: ana.id, orgRole: OrgRole.MEMBER, title: "Editora" },
      { orgId: labstream.id, userId: javier.id, orgRole: OrgRole.MEMBER, title: "DOP" },

      { orgId: productoraNorte.id, userId: sofia.id, orgRole: OrgRole.OWNER, title: "Productora" },
      { orgId: productoraNorte.id, userId: diego.id, orgRole: OrgRole.MEMBER, title: "Director" },

      { orgId: pepsico.id, userId: brand1.id, orgRole: OrgRole.OWNER, title: "Brand Manager" },
      { orgId: pepsico.id, userId: brand2.id, orgRole: OrgRole.MEMBER, title: "Marketing Director" },

      { orgId: bavaria.id, userId: brand3.id, orgRole: OrgRole.OWNER, title: "Brand Manager" },
    ],
  });

  // ─── Templates ────
  const fullTemplate = await prisma.projectTemplate.create({
    data: {
      name: "Comercial completo (30s)",
      description:
        "Pipeline tradicional: brief → propuesta → pre-producción → rodaje → post → entrega",
      isDefault: true,
      phases: {
        create: [
          {
            type: PhaseType.BRIEF,
            name: "Brief",
            order: 0,
            tasks: {
              create: [
                { title: "Recibir brief del cliente", order: 0 },
                { title: "Reunión de alineación", order: 1, defaultRole: ProjectRole.PRODUCER },
              ],
            },
          },
          {
            type: PhaseType.PROPOSAL,
            name: "Propuesta",
            order: 1,
            tasks: {
              create: [
                { title: "Tratamiento creativo", order: 0, defaultRole: ProjectRole.DIRECTOR },
                { title: "Presupuesto y cronograma", order: 1, defaultRole: ProjectRole.PRODUCER },
              ],
            },
          },
          {
            type: PhaseType.PRE,
            name: "Pre-producción",
            order: 2,
            tasks: {
              create: [
                { title: "Guion / storyboard", order: 0 },
                { title: "Casting", order: 1, defaultRole: ProjectRole.PRODUCER },
                { title: "Scouting de locaciones", order: 2 },
                { title: "PPM (Pre-production meeting)", order: 3, defaultRole: ProjectRole.PRODUCER },
              ],
            },
          },
          {
            type: PhaseType.PRODUCTION,
            name: "Rodaje",
            order: 3,
            tasks: {
              create: [
                { title: "Día 1 de rodaje", order: 0, defaultRole: ProjectRole.DIRECTOR },
                { title: "Reporte de producción", order: 1, defaultRole: ProjectRole.PRODUCER },
              ],
            },
          },
          {
            type: PhaseType.POST,
            name: "Post-producción",
            order: 4,
            tasks: {
              create: [
                { title: "Selectos", order: 0, defaultRole: ProjectRole.EDITOR },
                { title: "Rough cut", order: 1, defaultRole: ProjectRole.EDITOR },
                { title: "Fine cut", order: 2, defaultRole: ProjectRole.EDITOR },
                { title: "Color", order: 3, defaultRole: ProjectRole.COLORIST },
                { title: "Mezcla de audio", order: 4, defaultRole: ProjectRole.SOUND },
              ],
            },
          },
          {
            type: PhaseType.DELIVERY,
            name: "Entrega",
            order: 5,
            tasks: {
              create: [
                { title: "Master final", order: 0, defaultRole: ProjectRole.EDITOR },
                { title: "Versiones por canal", order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  const lightTemplate = await prisma.projectTemplate.create({
    data: {
      name: "Cobertura ligera",
      description: "Para proyectos pequeños — solo productor + cámara y edición rápida",
      phases: {
        create: [
          {
            type: PhaseType.PRE,
            name: "Preparación",
            order: 0,
            tasks: {
              create: [
                { title: "Confirmar logística", order: 0, defaultRole: ProjectRole.PRODUCER },
                { title: "Lista de tomas", order: 1, defaultRole: ProjectRole.CAMERA },
              ],
            },
          },
          {
            type: PhaseType.PRODUCTION,
            name: "Captura",
            order: 1,
            tasks: {
              create: [
                { title: "Cobertura del evento", order: 0, defaultRole: ProjectRole.CAMERA },
              ],
            },
          },
          {
            type: PhaseType.POST,
            name: "Edición rápida",
            order: 2,
            tasks: {
              create: [
                { title: "Cut final", order: 0, defaultRole: ProjectRole.EDITOR },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.projectTemplate.create({
    data: {
      name: "Sesión de fotografía",
      description: "Fotografía de producto, editorial o campaña",
      phases: {
        create: [
          {
            type: PhaseType.PRE,
            name: "Pre-producción",
            order: 0,
            tasks: {
              create: [
                { title: "Mood board / referencias", order: 0 },
                { title: "Producción y logística", order: 1, defaultRole: ProjectRole.PRODUCER },
              ],
            },
          },
          {
            type: PhaseType.PRODUCTION,
            name: "Sesión",
            order: 1,
            tasks: {
              create: [
                { title: "Día de sesión", order: 0, defaultRole: ProjectRole.PHOTOGRAPHER },
              ],
            },
          },
          {
            type: PhaseType.POST,
            name: "Selección y retoque",
            order: 2,
            tasks: {
              create: [
                { title: "Selección", order: 0, defaultRole: ProjectRole.PHOTOGRAPHER },
                { title: "Retoque", order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  await prisma.projectTemplate.create({
    data: {
      name: "Streaming en vivo",
      description: "Eventos en vivo con multicámara",
      phases: {
        create: [
          {
            type: PhaseType.PRE,
            name: "Preparación técnica",
            order: 0,
            tasks: {
              create: [
                { title: "Plano técnico", order: 0 },
                { title: "Pruebas de señal", order: 1 },
              ],
            },
          },
          {
            type: PhaseType.PRODUCTION,
            name: "Transmisión",
            order: 1,
            tasks: {
              create: [
                { title: "Día del evento", order: 0 },
              ],
            },
          },
          {
            type: PhaseType.DELIVERY,
            name: "Entrega",
            order: 2,
            tasks: {
              create: [
                { title: "Grabación master", order: 0 },
                { title: "Cortes para redes", order: 1 },
              ],
            },
          },
        ],
      },
    },
  });

  // Helper: clona plantilla → fases + tareas en el proyecto
  async function applyTemplate(projectId: string, templateId: string) {
    const tpl = await prisma.projectTemplate.findUnique({
      where: { id: templateId },
      include: { phases: { include: { tasks: true } } },
    });
    if (!tpl) return;

    for (const tp of tpl.phases.sort((a, b) => a.order - b.order)) {
      const phase = await prisma.phase.create({
        data: {
          projectId,
          type: tp.type,
          name: tp.name,
          order: tp.order,
          status:
            tp.order === 0 ? PhaseStatus.ACTIVE : PhaseStatus.PENDING,
        },
      });
      for (const tt of tp.tasks.sort((a, b) => a.order - b.order)) {
        await prisma.task.create({
          data: {
            phaseId: phase.id,
            title: tt.title,
            order: tt.order,
            status: "TODO",
          },
        });
      }
    }
  }

  // ─── Proyecto 1: PepsiCo Agro · gestionado por Labstream ────
  const p1 = await prisma.project.create({
    data: {
      code: "PEPSI-2026-AGRO",
      name: "PepsiCo Agro · Comercial 30s",
      description:
        "Comercial para campaña agrícola sustentable de PepsiCo en LATAM",
      status: ProjectStatus.ACTIVE,
      startDate: new Date("2026-04-01"),
      dueDate: new Date("2026-06-30"),
      clientOrgId: pepsico.id,
      producerOrgId: labstream.id,
      templateId: fullTemplate.id,
      createdById: master.id,
    },
  });
  await applyTemplate(p1.id, fullTemplate.id);

  await prisma.projectMember.createMany({
    data: [
      { projectId: p1.id, userId: lucia.id, projectRole: ProjectRole.PRODUCER },
      { projectId: p1.id, userId: carlos.id, projectRole: ProjectRole.DIRECTOR },
      { projectId: p1.id, userId: ana.id, projectRole: ProjectRole.EDITOR },
      { projectId: p1.id, userId: javier.id, projectRole: ProjectRole.DOP },
      { projectId: p1.id, userId: brand1.id, projectRole: ProjectRole.CLIENT_LEAD },
      { projectId: p1.id, userId: brand2.id, projectRole: ProjectRole.CLIENT_VIEWER },
    ],
  });

  // Entregables y versiones del proyecto 1
  const p1Phases = await prisma.phase.findMany({
    where: { projectId: p1.id },
    orderBy: { order: "asc" },
  });
  const proposalPhase = p1Phases.find((p) => p.type === PhaseType.PROPOSAL);
  const postPhase = p1Phases.find((p) => p.type === PhaseType.POST);

  const treatmentDeliverable = await prisma.deliverable.create({
    data: {
      projectId: p1.id,
      phaseId: proposalPhase?.id,
      kind: DeliverableKind.TREATMENT,
      title: "Tratamiento creativo v1",
      description: "Propuesta visual y narrativa",
      status: DeliverableStatus.APPROVED,
    },
  });
  const tv1 = await prisma.deliverableVersion.create({
    data: {
      deliverableId: treatmentDeliverable.id,
      versionNumber: 1,
      externalUrl: "https://drive.google.com/file/demo-tratamiento-v1",
      notes: "Primera versión del tratamiento",
      submittedById: carlos.id,
    },
  });
  await prisma.deliverable.update({
    where: { id: treatmentDeliverable.id },
    data: { currentVersionId: tv1.id },
  });
  await prisma.approval.create({
    data: {
      deliverableId: treatmentDeliverable.id,
      versionId: tv1.id,
      stage: ApprovalStage.INTERNAL,
      decision: ApprovalDecision.APPROVED,
      comment: "Producción aprueba para envío a cliente",
      decidedById: lucia.id,
    },
  });
  await prisma.approval.create({
    data: {
      deliverableId: treatmentDeliverable.id,
      versionId: tv1.id,
      stage: ApprovalStage.CLIENT,
      decision: ApprovalDecision.APPROVED,
      comment: "Nos encanta la dirección, sigamos",
      decidedById: brand1.id,
    },
  });

  const cutDeliverable = await prisma.deliverable.create({
    data: {
      projectId: p1.id,
      phaseId: postPhase?.id,
      kind: DeliverableKind.ROUGH_CUT,
      title: "Rough cut",
      description: "Primer corte completo del comercial",
      status: DeliverableStatus.CLIENT_REVIEW,
    },
  });
  const cv1 = await prisma.deliverableVersion.create({
    data: {
      deliverableId: cutDeliverable.id,
      versionNumber: 1,
      externalUrl: "https://vimeo.com/demo-rough-cut-v1",
      notes: "Primera versión, ritmo general listo",
      submittedById: ana.id,
    },
  });
  await prisma.approval.create({
    data: {
      deliverableId: cutDeliverable.id,
      versionId: cv1.id,
      stage: ApprovalStage.INTERNAL,
      decision: ApprovalDecision.APPROVED,
      comment: "Listo para enviar al cliente",
      decidedById: lucia.id,
    },
  });
  await prisma.deliverable.update({
    where: { id: cutDeliverable.id },
    data: { currentVersionId: cv1.id },
  });
  await prisma.comment.createMany({
    data: [
      {
        versionId: cv1.id,
        authorId: brand1.id,
        body: "Me gusta el tono general. Queda revisar el ritmo del segundo bloque.",
      },
      {
        versionId: cv1.id,
        authorId: brand2.id,
        body: "+1, también la música del cierre se siente baja.",
      },
    ],
  });

  // ─── Demo: 3 entregables con links reales de Google Drive ────
  const photosDeliverable = await prisma.deliverable.create({
    data: {
      projectId: p1.id,
      kind: DeliverableKind.PHOTOSET,
      title: "Sesión fotográfica · Demo Drive",
      description: "Galería de fotos en una carpeta de Google Drive — cliente puede ver, seleccionar y descargar",
      status: DeliverableStatus.CLIENT_REVIEW,
    },
  });
  const photosV1 = await prisma.deliverableVersion.create({
    data: {
      deliverableId: photosDeliverable.id,
      versionNumber: 1,
      externalUrl: "https://drive.google.com/drive/folders/181DMwVu8GaR3pjA_RVamv1kIq9YE920a?usp=sharing",
      embedKind: EmbedKind.DRIVE_FOLDER_PHOTOS,
      driveFolderId: "181DMwVu8GaR3pjA_RVamv1kIq9YE920a",
      notes: "Selectos finales de la sesión. Aprobar y descargar las que vayan a campaña.",
      submittedById: javier.id,
    },
  });
  await prisma.deliverable.update({
    where: { id: photosDeliverable.id },
    data: { currentVersionId: photosV1.id },
  });
  await prisma.approval.create({
    data: {
      deliverableId: photosDeliverable.id,
      versionId: photosV1.id,
      stage: ApprovalStage.INTERNAL,
      decision: ApprovalDecision.APPROVED,
      comment: "Selección aprobada, listo para cliente",
      decidedById: lucia.id,
    },
  });

  const videoDeliverable = await prisma.deliverable.create({
    data: {
      projectId: p1.id,
      kind: DeliverableKind.MASTER,
      title: "Master final · Demo video Drive (1 archivo)",
      description: "Video master en Drive — el más usado por la productora",
      status: DeliverableStatus.CLIENT_REVIEW,
    },
  });
  const videoV1 = await prisma.deliverableVersion.create({
    data: {
      deliverableId: videoDeliverable.id,
      versionNumber: 1,
      externalUrl: "https://drive.google.com/file/d/1TC5IXPgNsoUreb4E4NKSGMrd6BXhMt8u/view?usp=sharing",
      embedKind: EmbedKind.DRIVE_FILE,
      driveFileId: "1TC5IXPgNsoUreb4E4NKSGMrd6BXhMt8u",
      notes: "Master listo. Reproducir directo en la app, sin descargar.",
      submittedById: ana.id,
    },
  });
  await prisma.deliverable.update({
    where: { id: videoDeliverable.id },
    data: { currentVersionId: videoV1.id },
  });
  await prisma.approval.create({
    data: {
      deliverableId: videoDeliverable.id,
      versionId: videoV1.id,
      stage: ApprovalStage.INTERNAL,
      decision: ApprovalDecision.APPROVED,
      comment: "Pre-aprobado",
      decidedById: lucia.id,
    },
  });

  const videosDeliverable = await prisma.deliverable.create({
    data: {
      projectId: p1.id,
      kind: DeliverableKind.OTHER,
      title: "Cortes para redes · Demo carpeta videos",
      description: "Carpeta con varios videos — cliente reproduce cada uno y descarga si quiere",
      status: DeliverableStatus.CLIENT_REVIEW,
    },
  });
  const videosV1 = await prisma.deliverableVersion.create({
    data: {
      deliverableId: videosDeliverable.id,
      versionNumber: 1,
      externalUrl: "https://drive.google.com/drive/u/0/folders/1I1kRnLd4aovWhfLnW_rJ-eh4Fz7QtucS",
      embedKind: EmbedKind.DRIVE_FOLDER_VIDEOS,
      driveFolderId: "1I1kRnLd4aovWhfLnW_rJ-eh4Fz7QtucS",
      notes: "3 cortes para Reels / TikTok / YouTube Shorts.",
      submittedById: ana.id,
    },
  });
  await prisma.deliverable.update({
    where: { id: videosDeliverable.id },
    data: { currentVersionId: videosV1.id },
  });
  await prisma.approval.create({
    data: {
      deliverableId: videosDeliverable.id,
      versionId: videosV1.id,
      stage: ApprovalStage.INTERNAL,
      decision: ApprovalDecision.APPROVED,
      comment: "Pre-aprobado para revisión cliente",
      decidedById: lucia.id,
    },
  });

  // ─── Proyecto 2: PepsiCo Refresh · gestionado por Productora Norte ────
  const p2 = await prisma.project.create({
    data: {
      code: "PEPSI-2026-REFRESH",
      name: "PepsiCo Refresh · Sesión fotográfica",
      description:
        "Campaña fotográfica para nuevo packaging Refresh — gestionada por Productora Norte",
      status: ProjectStatus.ACTIVE,
      startDate: new Date("2026-05-01"),
      dueDate: new Date("2026-05-30"),
      clientOrgId: pepsico.id,
      producerOrgId: productoraNorte.id,
      templateId: lightTemplate.id,
      createdById: master.id,
    },
  });
  await applyTemplate(p2.id, lightTemplate.id);

  await prisma.projectMember.createMany({
    data: [
      { projectId: p2.id, userId: sofia.id, projectRole: ProjectRole.PRODUCER },
      { projectId: p2.id, userId: diego.id, projectRole: ProjectRole.DIRECTOR },
      { projectId: p2.id, userId: javier.id, projectRole: ProjectRole.PHOTOGRAPHER }, // mismo Javier en ambos proyectos
      { projectId: p2.id, userId: brand1.id, projectRole: ProjectRole.CLIENT_LEAD },
    ],
  });

  // ─── Proyecto 3: Bavaria · streaming ────
  const p3 = await prisma.project.create({
    data: {
      code: "BAVARIA-2026-LIVE",
      name: "Bavaria Live · Festival",
      description: "Transmisión en vivo del festival corporativo",
      status: ProjectStatus.DRAFT,
      startDate: new Date("2026-06-15"),
      dueDate: new Date("2026-06-15"),
      clientOrgId: bavaria.id,
      producerOrgId: labstream.id,
      createdById: master.id,
    },
  });

  await prisma.projectMember.createMany({
    data: [
      { projectId: p3.id, userId: lucia.id, projectRole: ProjectRole.PRODUCER },
      { projectId: p3.id, userId: brand3.id, projectRole: ProjectRole.CLIENT_LEAD },
    ],
  });

  // ─── Activity log básica ────
  await prisma.activityLog.createMany({
    data: [
      {
        projectId: p1.id,
        actorId: master.id,
        type: "PROJECT_CREATED",
        summary: "Proyecto creado y asignado a Labstream Studio",
      },
      {
        projectId: p1.id,
        actorId: lucia.id,
        type: "MEMBER_ADDED",
        summary: "Equipo asignado: Carlos (director), Ana (editora), Javier (DOP)",
      },
      {
        projectId: p1.id,
        actorId: carlos.id,
        type: "DELIVERABLE_SUBMITTED",
        summary: "Tratamiento creativo v1 enviado",
      },
      {
        projectId: p1.id,
        actorId: brand1.id,
        type: "APPROVED",
        summary: "Cliente aprobó el tratamiento creativo",
      },
      {
        projectId: p1.id,
        actorId: ana.id,
        type: "DELIVERABLE_SUBMITTED",
        summary: "Rough cut v1 enviado a cliente para revisión",
      },
      {
        projectId: p2.id,
        actorId: master.id,
        type: "PROJECT_CREATED",
        summary: "Proyecto asignado a Productora Norte",
      },
    ],
  });

  console.log("Webapp:");
  console.log(`  3 organizaciones (1 interna + 1 productora externa + 2 clientes)`);
  console.log(`  4 plantillas de proyecto`);
  console.log(`  3 proyectos demo`);
  console.log(`\nUsuarios demo (contraseña: Demo2026!):`);
  console.log(`  Master:    admin@labstream.local (Labstream2026!)`);
  console.log(`  Productor: lucia@labstream.local`);
  console.log(`  Director:  carlos@labstream.local`);
  console.log(`  Editora:   ana@labstream.local`);
  console.log(`  DOP:       javier@labstream.local`);
  console.log(`  Productora externa: sofia@productoranorte.com`);
  console.log(`  Cliente PepsiCo (lead): marta@pepsico.com`);
  console.log(`  Cliente PepsiCo (view): ricardo@pepsico.com`);
  console.log(`  Cliente Bavaria:        elena@bavaria.co`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
