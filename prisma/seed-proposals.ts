/**
 * Seed de una propuesta demo para probar el módulo de propuestas.
 *
 * Uso local:  npx tsx prisma/seed-proposals.ts
 */

import { PrismaClient, ProposalStatus } from "@prisma/client";

const prisma = new PrismaClient();

const IMG = {
  cinema:
    "/media/hero-cinema.jpg",
  set: "/media/set-produccion.jpg",
  editorial:
    "/media/editorial.jpg",
  color:
    "/media/color-grading.jpg",
  concert:
    "/media/concert.jpg",
  cameraGear:
    "/media/camera-gear.jpg",
  studio:
    "/media/studio.jpg",
  location:
    "/media/location.jpg",
};

async function main() {
  const slug = "pepsico-verano-2026-demo";

  await prisma.proposal.upsert({
    where: { slug },
    update: {},
    create: {
      slug,
      code: "PROP-2026-001",
      status: ProposalStatus.SENT,
      title: "Comercial de verano 2026",
      clientName: "PepsiCo",
      clientContact: "Marta Salinas · Brand Manager",
      clientEmail: "marta@pepsico.com",
      preparedBy: "Lucía Pérez · Labstream",
      coverImageUrl: IMG.set,
      tagline:
        "Una pieza fresca y luminosa para conectar con jóvenes en la temporada más vibrante del año.",
      intro: `Marta, gracias por confiarnos esta campaña.

Entendemos que el verano 2026 es clave para reconectar a PepsiCo con audiencias jóvenes en LATAM, sin caer en los clichés de siempre. En esta propuesta encontrarás cómo lo abordaríamos: el concepto creativo, el plan de producción, los tiempos y la inversión.

Lo armamos para que puedas decir "sí" con confianza.`,
      aboutHeading: "Una casa productora obsesionada con el detalle",
      aboutBody: `Llevamos 12 años produciendo audiovisual en LATAM. Empezamos con un comercial para una panadería de barrio; hoy somos un estudio de 25 personas que trabaja con marcas globales y locales.

Tenemos productora, post-producción y equipo de IA propios. Pero lo que no cambió es que cada proyecto se trata como si fuera el único.`,
      stats: [
        { value: "12", label: "Años de experiencia" },
        { value: "320+", label: "Proyectos entregados" },
        { value: "80+", label: "Marcas atendidas" },
        { value: "6 sem", label: "De brief a máster" },
      ],
      selectedWork: [
        { title: "Campaña verano 2025", client: "PepsiCo", imageUrl: IMG.set },
        { title: "Festival en vivo", client: "Bavaria", imageUrl: IMG.concert },
        { title: "Editorial de marca", client: "Andes Coffee", imageUrl: IMG.editorial },
      ],
      treatmentHeading: "Verano sin filtros: alegría real, color vivo",
      treatmentBody: `Queremos alejarnos del verano publicitario perfecto y construir uno que se sienta real: amigos, playa, música y un Pepsi helado de por medio.

El ritmo será rápido pero respirable, con una paleta cálida y saturada, y un casting diverso y auténtico. Nada de poses; momentos.`,
      treatmentSections: [
        {
          heading: "Dirección de arte",
          body: "Paleta cálida con acentos del azul de marca. Locaciones reales en costa caribe colombiana. Props honestos: nada que se sienta de catálogo.",
          imageUrl: IMG.location,
        },
        {
          heading: "Fotografía y look",
          body: "Cámara cinema 6K, lentes anamórficos para textura. Luz natural complementada al atardecer para esa hora dorada que se siente verano.",
          imageUrl: IMG.cameraGear,
        },
        {
          heading: "Música y montaje",
          body: "Track original con energía de festival. Montaje al ritmo, con respiros para que el producto protagonice los momentos clave.",
          imageUrl: IMG.color,
        },
      ],
      moodboard: [
        { url: IMG.set, alt: "Set playa" },
        { url: IMG.location, alt: "Locación costa" },
        { url: IMG.color, alt: "Paleta cálida" },
        { url: IMG.cinema, alt: "Look cinema" },
      ],
      references: [
        { title: "Referencia de ritmo y color", url: "https://vimeo.com/76979871" },
        { title: "Referencia de casting natural", url: "https://vimeo.com/76979871" },
      ],
      timeline: [
        { phase: "Brief y concepto", dateLabel: "Semana 1", desc: "Alineación de objetivos, guion y tratamiento aprobado." },
        { phase: "Pre-producción", dateLabel: "Semanas 2-3", desc: "Casting, locaciones, scouting, PPM con tu equipo." },
        { phase: "Rodaje", dateLabel: "Semana 4 · 3 días", desc: "Cartagena y Santa Marta con equipo cinema 6K." },
        { phase: "Post-producción", dateLabel: "Semanas 5-7", desc: "Edición, color HDR, sound design original, 3 rondas de feedback." },
        { phase: "Entrega", dateLabel: "Semana 8", desc: "Másters por canal listos para publicar." },
      ],
      deliverables: [
        { item: "Comercial máster", detail: "30s · 16:9 · 4K HDR", qty: "1" },
        { item: "Cortes para redes", detail: "9:16 y 1:1 · 15s y 6s", qty: "4" },
        { item: "Fotografías del rodaje", detail: "Selección retocada para social", qty: "20" },
        { item: "Archivos fuente", detail: "Proyecto + másters de entrega", qty: "1" },
      ],
      currency: "COP",
      taxRatePct: 19,
      showPrices: true,
      budgetItems: [
        { concept: "Pre-producción", detail: "Casting, locaciones, scouting, PPM", qty: "1", unitPrice: "18000000" },
        { concept: "Producción (rodaje)", detail: "3 días · equipo cinema + crew", qty: "3", unitPrice: "22000000" },
        { concept: "Post-producción", detail: "Edición, color HDR, sound design", qty: "1", unitPrice: "26000000" },
        { concept: "Cortes para redes", detail: "4 versiones verticales/cuadradas", qty: "1", unitPrice: "9000000" },
      ],
      budgetNote: `El presupuesto es cerrado e incluye todo lo desglosado arriba. No incluye: talento con fee de imagen extendido, permisos especiales de locación ni pauta. Cualquier extra se cotiza y aprueba antes de ejecutarse.

Forma de pago sugerida: 50% al inicio, 30% al iniciar rodaje, 20% contra entrega.`,
      ctaHeading: "¿Le damos verano a esto?",
      ctaBody:
        "Si te hace sentido, reservamos las fechas de rodaje y arrancamos pre-producción esta misma semana.",
      validUntil: new Date("2026-07-15"),
    },
  });

  console.log(`✔ Propuesta demo lista → /propuesta/${slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
