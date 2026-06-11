/**
 * Seed dedicado para todo el contenido público (Fase 1).
 * Se ejecuta independiente del seed principal.
 *
 * Uso local:  npx tsx prisma/seed-public.ts
 * Uso Neon:   DATABASE_URL='...' npx tsx prisma/seed-public.ts
 */

import {
  PrismaClient,
  PortfolioCategory,
  BlogPostStatus,
} from "@prisma/client";

const prisma = new PrismaClient();

// Imágenes Unsplash audiovisual de alta calidad
const IMG = {
  cinema:
    "https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=2400&q=80",
  set: "https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?auto=format&fit=crop&w=2000&q=80",
  editorial:
    "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=2000&q=80",
  streaming:
    "https://images.unsplash.com/photo-1518930259200-3e5f1b3c0f5e?auto=format&fit=crop&w=2000&q=80",
  location:
    "https://images.unsplash.com/photo-1500964757637-c85e8a162699?auto=format&fit=crop&w=2000&q=80",
  color:
    "https://images.unsplash.com/photo-1505739679850-7adc7b8c4dab?auto=format&fit=crop&w=2000&q=80",
  director:
    "https://images.unsplash.com/photo-1503095396549-807759245b35?auto=format&fit=crop&w=2000&q=80",
  camera:
    "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=2000&q=80",
  studio:
    "https://images.unsplash.com/photo-1496024840928-4c417adf211d?auto=format&fit=crop&w=2000&q=80",
  cameraGear:
    "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=2000&q=80",
  productPhoto:
    "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=2000&q=80",
  fashion:
    "https://images.unsplash.com/photo-1469334031218-e382a71b716b?auto=format&fit=crop&w=2000&q=80",
  concert:
    "https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?auto=format&fit=crop&w=2000&q=80",
  conference:
    "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=2000&q=80",
  edit:
    "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?auto=format&fit=crop&w=2000&q=80",
  drone:
    "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=2000&q=80",
  // Equipo (fotos genéricas)
  person1:
    "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=600&q=80",
  person2:
    "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=600&q=80",
  person3:
    "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=600&q=80",
  person4:
    "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=600&q=80",
  person5:
    "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?auto=format&fit=crop&w=600&q=80",
  person6:
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80",
};

async function main() {
  console.log("Seeding public content (Fase 1)…");

  // Los 6 servicios son navegación fija del sitio (el navbar enlaza a sus
  // slugs). Se siembran SIEMPRE con upsert idempotente —incluso si ya hay
  // contenido— para que /servicio/[slug] nunca dé 404. No borra nada.
  await seedServices();

  const portfolioCount = await prisma.portfolioProject.count();
  const blogCount = await prisma.blogPost.count();
  const teamCount = await prisma.teamMember.count();

  if (portfolioCount > 0 || blogCount > 0 || teamCount > 0) {
    console.log(
      `✔ Servicios asegurados. Resto del seed omitido (ya hay contenido: portfolio=${portfolioCount}, blog=${blogCount}, team=${teamCount}). ` +
        `Edita el contenido desde el CMS.`,
    );
    return;
  }

  await seedPortfolio();
  await seedBlog();
  await seedTestimonials();
  await seedClientLogos();
  await seedFaq();
  await seedTeam();
  await seedAbout();

  console.log("\n✔ Seed público completo");
}

async function seedPortfolio() {
  await prisma.portfolioProject.deleteMany();
  await prisma.portfolioProject.createMany({
    data: [
      {
        slug: "pepsi-summer-2025",
        title: "PepsiCo · Campaña verano 2025",
        client: "PepsiCo",
        category: PortfolioCategory.COMERCIAL,
        year: 2025,
        excerpt:
          "Comercial de 30s para la campaña de verano que pasó por TV y redes en LATAM.",
        brief:
          "PepsiCo quería un comercial fresco que conectara con jóvenes en playas y festivales sin caer en clichés. Tono: alegría auténtica, color vivo, ritmo rápido pero respirable.",
        process:
          "Pre-producción de 2 semanas con casting en 3 ciudades. Rodaje 4 días entre Cartagena y Santa Marta con equipo cinema 6K. Post de 3 semanas: edit, color HDR-ready, sound design original.",
        result:
          "12M impresiones en primera semana, 15% lift en intención de compra (Nielsen). Versión cortada para Reels generó 4.2M reproducciones orgánicas.",
        coverImageUrl: IMG.set,
        videoUrl: "https://vimeo.com/76979871",
        galleryImages: [
          { url: IMG.set, alt: "Set de rodaje", caption: "Día 2 · Cartagena" },
          { url: IMG.editorial, alt: "Detrás de cámaras" },
          { url: IMG.cameraGear, alt: "Cámara cinema" },
          { url: IMG.color, alt: "Color grading" },
        ],
        credits: [
          { role: "Directora", name: "Lucía Pérez" },
          { role: "DOP", name: "Javier Mora" },
          { role: "Editora", name: "Ana Torres" },
          { role: "Producción", name: "Labstream Studio" },
        ],
        tags: ["comercial", "campaña", "verano", "TV"],
        featured: true,
        order: 0,
        publishedAt: new Date("2025-07-15"),
      },
      {
        slug: "bavaria-festival-live",
        title: "Bavaria · Festival en vivo",
        client: "Bavaria",
        category: PortfolioCategory.STREAMING,
        year: 2024,
        excerpt:
          "Transmisión en vivo multicámara de festival corporativo con 8 cámaras y 12 mil asistentes virtuales simultáneos.",
        brief:
          "Bavaria celebraba 130 años con un festival híbrido. Necesitaban transmisión multicámara con switching en vivo, gráficos del momento y latencia < 5s.",
        process:
          "Pre-evento técnico de 1 mes. Día del evento: 8 cámaras, 12 audio inputs, switcher TriCaster, streaming a YouTube + Vimeo + Twitch simultáneo. Backup de redundancia 4G.",
        result:
          "12.4k espectadores pico simultáneo. Cero caídas en 6 horas de transmisión. Highlights post-evento generaron 850k vistas.",
        coverImageUrl: IMG.concert,
        videoUrl: "https://vimeo.com/76979871",
        galleryImages: [
          { url: IMG.concert, alt: "Escenario principal" },
          { url: IMG.streaming, alt: "Control room" },
        ],
        credits: [
          { role: "Director técnico", name: "Carlos Ruiz" },
          { role: "Switcher", name: "Diego Castaño" },
          { role: "Audio engineer", name: "Mateo Ariza" },
        ],
        tags: ["streaming", "live", "multicámara", "evento"],
        featured: true,
        order: 1,
        publishedAt: new Date("2024-11-20"),
      },
      {
        slug: "andes-coffee-editorial",
        title: "Andes Coffee · Editorial de marca",
        client: "Andes Coffee Co.",
        category: PortfolioCategory.FOTOGRAFIA,
        year: 2025,
        excerpt:
          "Sesión editorial completa para el rebranding de una cadena de cafés boutique colombiana.",
        brief:
          "Reposicionamiento de marca con foco en origen y ritual. Necesitaban ~80 fotos en producto, ambiente y manos para 3 campañas (web, packaging, social).",
        process:
          "1 día de scouting + 3 días de producción en finca cafetera y café flagship. Equipo Phase One + iluminación natural complementada. Selectos y retoque en 2 semanas.",
        result:
          "Rebranding lanzado en julio 2025. Engagement +180% en Instagram, presencia en revistas Bocados y Nylon Latam.",
        coverImageUrl: IMG.editorial,
        galleryImages: [
          { url: IMG.editorial, alt: "Foto editorial 1" },
          { url: IMG.productPhoto, alt: "Producto" },
          { url: IMG.fashion, alt: "Lifestyle" },
        ],
        beforeAfter: [
          { before: IMG.location, after: IMG.editorial, label: "Color y composición" },
        ],
        credits: [
          { role: "Fotógrafo", name: "Javier Mora" },
          { role: "Stylist", name: "Sofía Ramírez" },
          { role: "Retoque", name: "Ana Torres" },
        ],
        tags: ["fotografía", "editorial", "branding"],
        featured: true,
        order: 2,
        publishedAt: new Date("2025-06-10"),
      },
      {
        slug: "fundacion-eco-doc",
        title: "Fundación Eco · Documental",
        client: "Fundación Eco",
        category: PortfolioCategory.DOCUMENTAL,
        year: 2024,
        excerpt:
          "Mediometraje documental sobre conservación del bosque húmedo del Pacífico colombiano.",
        brief:
          "Contar la historia de comunidades indígenas que protegen 50,000 hectáreas de bosque amenazado. Tono cinematográfico pero respetuoso.",
        process:
          "3 expediciones de 10 días cada una en Chocó. Equipo cámara reducido (RED Komodo + drones). Entrevistas con 14 líderes comunitarios. Post de 3 meses con colorista especializado en naturaleza.",
        result:
          "Selección oficial en festivales de Cartagena, Toulouse y NYC. Distribución en Mubi LATAM. Recaudó $180k USD para la fundación en eventos de proyección.",
        coverImageUrl: IMG.location,
        videoUrl: "https://vimeo.com/76979871",
        galleryImages: [
          { url: IMG.location, alt: "Locación bosque" },
          { url: IMG.drone, alt: "Toma aérea" },
          { url: IMG.director, alt: "Dirección en campo" },
        ],
        credits: [
          { role: "Director", name: "Carlos Ruiz" },
          { role: "Productora", name: "Lucía Pérez" },
          { role: "DOP", name: "Javier Mora" },
        ],
        tags: ["documental", "naturaleza", "festival"],
        featured: false,
        order: 3,
        publishedAt: new Date("2024-09-05"),
      },
      {
        slug: "tech-reels-2025",
        title: "TechCorp · Serie de Reels",
        client: "TechCorp",
        category: PortfolioCategory.REDES_SOCIALES,
        year: 2025,
        excerpt:
          "12 Reels mensuales de productos tech con narrativa rápida y motion graphics.",
        brief:
          "Volumen mensual sostenido de contenido para Instagram + TikTok. Necesitaban look consistente, tiempos rápidos de aprobación.",
        process:
          "Sistema de producción modular: 1 día de rodaje al mes + edit en 5 días + aprobación cliente vía Labstream Webapp. Templates de motion reutilizables.",
        result:
          "Cuenta IG creció +35k seguidores en 6 meses. Engagement promedio 4.8% (industria: 1.6%). 3 Reels superaron 1M de vistas.",
        coverImageUrl: IMG.studio,
        galleryImages: [
          { url: IMG.studio, alt: "Set Reels" },
          { url: IMG.edit, alt: "Edit suite" },
        ],
        credits: [
          { role: "Director creativo", name: "Carlos Ruiz" },
          { role: "Editora", name: "Ana Torres" },
          { role: "Motion graphics", name: "Natalia Vega" },
        ],
        tags: ["reels", "social", "tech", "volumen"],
        featured: false,
        order: 4,
        publishedAt: new Date("2025-08-01"),
      },
      {
        slug: "ai-generative-test",
        title: "Pieza experimental IA generativa",
        client: "Auto-iniciado",
        category: PortfolioCategory.IA,
        year: 2025,
        excerpt:
          "Cortometraje 90 segundos con escenas generadas por Runway, voz sintética y composición tradicional.",
        brief:
          "Explorar workflow de IA generativa para producción acelerada. Test interno publicado en Vimeo Staff Picks.",
        process:
          "2 semanas de preproducción con Midjourney para concept art. 1 semana generando shots con Runway Gen-3 + Sora. Voz con ElevenLabs. Composición y color en DaVinci.",
        result:
          "Vimeo Staff Pick. 280k vistas en primer mes. Caso de estudio publicado en blog Labstream.",
        coverImageUrl: IMG.cinema,
        videoUrl: "https://vimeo.com/76979871",
        credits: [
          { role: "Concept y dirección", name: "Carlos Ruiz" },
          { role: "AI artist", name: "Natalia Vega" },
          { role: "Sound design", name: "Mateo Ariza" },
        ],
        tags: ["ia", "experimental", "generativo"],
        featured: false,
        order: 5,
        publishedAt: new Date("2025-05-22"),
      },
    ],
  });
  console.log("  · 6 proyectos de portafolio");
}

async function seedBlog() {
  await prisma.blogPost.deleteMany();
  await prisma.blogPost.createMany({
    data: [
      {
        slug: "como-planear-sesion-fotografia-producto",
        title: "Cómo planear una sesión de fotografía de producto que funciona",
        excerpt:
          "Las 5 decisiones que toman semanas y las que toman años. Una guía honesta para marcas que están por contratar su primera sesión.",
        coverImageUrl: IMG.productPhoto,
        authorName: "Javier Mora",
        authorRole: "Director de fotografía",
        category: "Fotografía",
        tags: ["fotografía", "producto", "branding"],
        status: BlogPostStatus.PUBLISHED,
        readMinutes: 7,
        publishedAt: new Date("2025-09-12"),
        content: `Una buena sesión de fotografía de producto no se decide el día del rodaje. Se decide en 5 momentos antes.

## 1. Definir uso final

¿Es para web? ¿Para empaque? ¿Para campaña en valla? Cada uso pide aspect ratio, resolución y look distintos. La pregunta más cara es "haz fotos lindas y ya vemos".

## 2. Brief con referencias visuales

Mínimo 6 imágenes que te encantan + 6 que no quieres. Sin esto, vas a iterar mucho en el set perdiendo plata por hora.

## 3. El stylist hace el 50%

La marca sale del 50% del estilismo (props, fondo, telas, manos). Si no hay budget para stylist, hagan menos productos pero bien.

## 4. Iluminación: natural vs estudio

Natural cuesta menos pero te ata a horarios. Estudio cuesta más pero te da control. Para campañas grandes recomiendo siempre estudio. Para social, mix.

## 5. Selectos y retoque: presupuesto silencioso

Una sesión de 80 fotos suele necesitar 30-40 horas de retoque. Si no se contempla, salen retocadas medio mal y pierden 30% del valor.

---

En Labstream hacemos sesiones desde $XK. Si quieres conversar tu próxima campaña, [escríbenos](/contacto).`,
      },
      {
        slug: "errores-comunes-streaming-corporativo",
        title: "5 errores comunes que arruinan un streaming corporativo",
        excerpt:
          "Después de transmitir 200+ eventos en vivo, estos son los errores que vemos repetidos. Y cómo evitarlos.",
        coverImageUrl: IMG.streaming,
        authorName: "Carlos Ruiz",
        authorRole: "Director técnico",
        category: "Streaming",
        tags: ["streaming", "live", "corporativo"],
        status: BlogPostStatus.PUBLISHED,
        readMinutes: 9,
        publishedAt: new Date("2025-08-28"),
        content: `Llevamos años transmitiendo eventos corporativos. Estos son los errores que más vemos — y cómo no caer en ellos.

## Error 1: subestimar el internet del lugar

90% de las transmisiones que caen, caen por internet. Lleven backup 4G de operador distinto al del hotel. Siempre.

## Error 2: 1 cámara para un evento de 4 horas

El espectador en casa se aburre. Mínimo 3 cámaras, idealmente 5 (general, presentador close, audiencia, detalle, cámara móvil).

## Error 3: audio del salón sin micros lavalier

El audio es 70% de la experiencia. Micros lavalier por presentador, NO depender del audio ambiental.

## Error 4: gráficos hechos en el momento

Lower thirds, transitions, logos — todo preparado y testeado el día anterior. Cero "lo armamos en el momento".

## Error 5: no tener plan B para cada cosa

Switcher de respaldo, cámara de respaldo, conexión de respaldo, presentador de respaldo. Sí, todo.

---

¿Vas a transmitir un evento? [Conversemos](/contacto), llevamos años haciéndolo.`,
      },
      {
        slug: "ia-en-produccion-audiovisual-2026",
        title: "IA en producción audiovisual: qué sirve y qué no en 2026",
        excerpt:
          "Después de un año experimentando con Runway, Sora, ElevenLabs y todo lo demás. La verdad sin hype.",
        coverImageUrl: IMG.cinema,
        authorName: "Natalia Vega",
        authorRole: "AI Artist",
        category: "IA",
        tags: ["ia", "producción", "futuro"],
        status: BlogPostStatus.PUBLISHED,
        readMinutes: 11,
        publishedAt: new Date("2025-10-05"),
        content: `La IA está cambiando la producción audiovisual. Pero no como dicen los influencers de Twitter. Aquí lo que realmente funciona.

## Funciona: concept art y mood boards

Midjourney + Krea ahorran 80% del tiempo de pre-producción visual. Antes pagabas a un ilustrador semanas; ahora generas opciones en horas.

## Funciona: voiceover sintético para borradores

ElevenLabs es indistinguible para voz neutral en español. Ideal para mostrar al cliente cómo quedaría el comercial antes de grabar talento real.

## Funciona a medias: video gen para B-roll abstracto

Runway Gen-3 y Sora son magia para shots imposibles (cohetes desde adentro, microscópicos, abstracciones). Pero falla en todo lo que tenga humanos hablando.

## NO funciona: reemplazar talento real

La uncanny valley sigue gigante. Los clientes notan en 0.5s que algo es "raro" aunque no puedan articularlo.

## NO funciona: storytelling complejo

La IA hace shots, no historias. Sin un director con criterio detrás, sale ruido bonito.

## Conclusión

La IA es una herramienta más en el cinturón. Quien la use bien hace mejores comerciales en menos tiempo. Quien la venda como "reemplazo total" está mintiendo.

---

En Labstream usamos IA en cada proyecto donde aporta. [Hablemos](/contacto).`,
      },
      {
        slug: "como-elegir-productora-audiovisual",
        title: "Cómo elegir una productora audiovisual sin equivocarte",
        excerpt:
          "Las 7 preguntas que deberías hacerle antes de firmar. Y las 3 banderas rojas para huir.",
        coverImageUrl: IMG.director,
        authorName: "Lucía Pérez",
        authorRole: "Productora ejecutiva",
        category: "Industria",
        tags: ["industria", "marca", "consejos"],
        status: BlogPostStatus.PUBLISHED,
        readMinutes: 6,
        publishedAt: new Date("2025-07-18"),
        content: `Si vas a contratar productora para una campaña importante, estas 7 preguntas te van a ahorrar dolor.

## 1. ¿Puedo ver 3 piezas similares a la mía?
Si no tienen proyectos parecidos, no son los mejores para tu caso (aunque sean talentosos).

## 2. ¿Quién va a estar en mi proyecto el día del rodaje?
A veces te vende el A-team y te entrega el B-team. Pídelo por escrito.

## 3. ¿Qué incluye el presupuesto y qué no?
Catering, talento, locación, post — pídelo desglosado. Sino aparecen "extras" después.

## 4. ¿Cuántas rondas de feedback en post?
Estándar: 3 rondas. Más de 5 es señal de proceso desordenado o cliente difícil.

## 5. ¿Cómo me entregan el material?
Drive, WeTransfer, plataforma propia? Importa para tus archivos a futuro.

## 6. ¿Quién es dueño de los rushes (raw footage)?
Negocia esto antes. A veces vale más que el comercial final.

## 7. ¿Pueden referenciarme con 2 clientes pasados?
Si dudan, mala señal.

## Banderas rojas

- 🚩 No te dan referencias
- 🚩 Presupuesto cerrado sin desglose
- 🚩 Te apuran a firmar "porque tienen huecos"

---

En Labstream tenemos políticas claras de todo lo anterior. [Conversemos](/contacto).`,
      },
    ],
  });
  console.log("  · 4 posts de blog");
}

async function seedTestimonials() {
  await prisma.testimonial.deleteMany();
  await prisma.testimonial.createMany({
    data: [
      {
        authorName: "Marta Salinas",
        authorRole: "Brand Manager",
        authorCompany: "PepsiCo",
        authorAvatarUrl: IMG.person1,
        body: "Trabajamos con Labstream en la campaña de verano 2025 y fue de las experiencias más fluidas que hemos tenido. El equipo entendió el brief al primer round y entregaron antes de tiempo.",
        rating: 5,
        featured: true,
        order: 0,
      },
      {
        authorName: "Andrés Restrepo",
        authorRole: "Director de Marketing",
        authorCompany: "Bavaria",
        authorAvatarUrl: IMG.person2,
        body: "Transmitir un evento de 6 horas con 12k espectadores simultáneos requiere un equipo muy técnico. Labstream lo manejó sin un solo problema. Volvemos cada festival.",
        rating: 5,
        featured: true,
        order: 1,
      },
      {
        authorName: "Camila Hoyos",
        authorRole: "CMO",
        authorCompany: "Andes Coffee Co.",
        authorAvatarUrl: IMG.person5,
        body: "El editorial que hicieron para nuestro rebranding superó lo que imaginaba. La sensibilidad para el origen del café se siente en cada foto.",
        rating: 5,
        featured: true,
        order: 2,
      },
      {
        authorName: "Sebastián López",
        authorRole: "Director Ejecutivo",
        authorCompany: "Fundación Eco",
        authorAvatarUrl: IMG.person6,
        body: "El documental que produjeron cambió cómo cuento la historia de la fundación. Nos abrió puertas que llevábamos 5 años intentando abrir.",
        rating: 5,
        featured: false,
        order: 3,
      },
      {
        authorName: "Valentina Cruz",
        authorRole: "Head of Content",
        authorCompany: "TechCorp",
        authorAvatarUrl: IMG.person3,
        body: "Producción mensual sostenida sin perder calidad — sé lo difícil que es. Labstream lo hace y se nota en nuestros números.",
        rating: 5,
        featured: false,
        order: 4,
      },
    ],
  });
  console.log("  · 5 testimonios");
}

async function seedClientLogos() {
  await prisma.clientLogo.deleteMany();
  // Logos de marcas reconocibles (placeholders SVG-like via texto)
  // Para Fase 1 uso URLs de logos genéricos. Reemplazar después con los reales.
  const logos = [
    "PepsiCo",
    "Bavaria",
    "Andes Coffee",
    "TechCorp",
    "Fundación Eco",
    "Aurora",
    "Vela",
    "Apex",
    "Norte",
    "Zeno",
  ];
  await prisma.clientLogo.createMany({
    data: logos.map((name, i) => ({
      name,
      // SVG inline data URL como placeholder — texto blanco sobre transparente
      logoUrl: `data:image/svg+xml;utf8,${encodeURIComponent(
        `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 80' width='200' height='80'>
          <text x='50%' y='50%' text-anchor='middle' dominant-baseline='middle'
            font-family='Figtree,sans-serif' font-weight='700' font-size='28' fill='white'>${name}</text>
        </svg>`,
      )}`,
      visible: true,
      featured: i < 6,
      order: i,
    })),
  });
  console.log("  · 10 logos de clientes");
}

async function seedFaq() {
  await prisma.faqItem.deleteMany();
  await prisma.faqItem.createMany({
    data: [
      {
        question: "¿Cuánto tarda producir un comercial completo?",
        answer:
          "Para un comercial de 30 segundos típico: 2 semanas de pre-producción, 1-3 días de rodaje, 3 semanas de post. Total: 6-8 semanas desde brief aprobado hasta master final.",
        category: "Tiempos",
        order: 0,
      },
      {
        question: "¿Trabajan con productoras externas o solo con su equipo?",
        answer:
          "Ambos. Tenemos equipo interno fuerte (productora, dirección, post) y red de productoras aliadas en LATAM. Para proyectos en Bogotá, Medellín, Cali, Cartagena, Lima, Buenos Aires y CDMX podemos coordinar producción local.",
        category: "Equipo",
        order: 1,
      },
      {
        question: "¿Cómo manejan las rondas de aprobación?",
        answer:
          "Cada cliente entra a nuestra Webapp donde ve el material aprobando con un click. Estándar: 3 rondas de feedback en post. Más rondas se cotizan aparte para no afectar el cronograma del resto del equipo.",
        category: "Proceso",
        order: 2,
      },
      {
        question: "¿Qué incluye el presupuesto?",
        answer:
          "Pre-producción, equipo cinema, equipo humano (productor, director, DOP, asistentes, post), edición, color y mezcla de audio. Talento, locaciones especiales, catering específico y permisos se cotizan aparte y se desglosan claramente.",
        category: "Pago",
        order: 3,
      },
      {
        question: "¿Pueden hacer producción y entrega en 1 semana?",
        answer:
          "Sí, para piezas de redes sociales (Reels, TikTok, Shorts) o cobertura de eventos. Para comerciales completos no recomendamos menos de 4 semanas — la calidad sufre y nadie sale ganando.",
        category: "Tiempos",
        order: 4,
      },
      {
        question: "¿Trabajan con IA en producción?",
        answer:
          "Sí, pero con criterio. Usamos IA para pre-producción visual (concept art con Midjourney), voiceover de borradores (ElevenLabs), B-roll abstracto (Runway), y workflow de edición. Nunca para reemplazar talento humano cuando se necesita autenticidad.",
        category: "Tecnología",
        order: 5,
      },
      {
        question: "¿De quién son los archivos raw después del proyecto?",
        answer:
          "Por defecto, Labstream conserva los rushes (footage raw) por 12 meses para uso interno y posibles retomas. Si el cliente quiere copia o propiedad de los rushes, se cotiza al inicio del proyecto.",
        category: "Pago",
        order: 6,
      },
      {
        question: "¿Cobran por proyecto o por hora?",
        answer:
          "Por proyecto, con presupuesto cerrado y desglosado. Hora solo en casos especiales (consultoría creativa, colorista para emergencias).",
        category: "Pago",
        order: 7,
      },
    ],
  });
  console.log("  · 8 FAQ items");
}

async function seedTeam() {
  await prisma.teamMember.deleteMany();
  await prisma.teamMember.createMany({
    data: [
      {
        name: "Lucía Pérez",
        role: "Productora ejecutiva",
        bio: "12 años produciendo para marcas en LATAM. Ex-Ogilvy, ex-VICE. Le gustan los retos imposibles con plazos imposibles.",
        photoUrl: IMG.person1,
        instagram: "@luciaproduce",
        featured: true,
        order: 0,
      },
      {
        name: "Carlos Ruiz",
        role: "Director / Director técnico",
        bio: "Director con sensibilidad documental aplicada a publicidad. También dirige los streamings técnicos de eventos grandes.",
        photoUrl: IMG.person2,
        vimeo: "carlosruiz",
        featured: true,
        order: 1,
      },
      {
        name: "Javier Mora",
        role: "Director de fotografía / Fotógrafo",
        bio: "Fotografía editorial y publicitaria. Phase One certified. Le obsesiona la luz natural.",
        photoUrl: IMG.person6,
        instagram: "@javiermoraph",
        featured: true,
        order: 2,
      },
      {
        name: "Ana Torres",
        role: "Editora / Coloristas",
        bio: "Edita en DaVinci desde 2015. Ha colorizado más de 200 piezas para marcas globales y locales.",
        photoUrl: IMG.person5,
        featured: true,
        order: 3,
      },
      {
        name: "Natalia Vega",
        role: "AI Artist / Motion designer",
        bio: "Pionera en integración de IA generativa en pipeline tradicional. Especializada en Runway, Midjourney, After Effects.",
        photoUrl: IMG.person3,
        instagram: "@nataliavega",
        featured: false,
        order: 4,
      },
      {
        name: "Mateo Ariza",
        role: "Sound designer",
        bio: "Diseña sonido para comerciales, documentales y streaming en vivo. Estudio Pro Tools propio.",
        photoUrl: IMG.person4,
        featured: false,
        order: 5,
      },
    ],
  });
  console.log("  · 6 miembros del equipo");
}

async function seedAbout() {
  await prisma.aboutContent.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      heroEyebrow: "Quiénes somos",
      heroTitle: "Una casa productora obsesionada con el detalle",
      heroSubtitle:
        "Llevamos 12 años haciendo audiovisual en LATAM. Empezamos con un comercial. Hoy somos un estudio de 25 personas trabajando con marcas globales y locales.",
      story: `Labstream nació en 2014 en un apartamento de Chapinero con tres personas y una RED Scarlet prestada.

El primer comercial fue para una panadería del barrio. Nos pagaron en panes durante una semana.

Hoy producimos para PepsiCo, Bavaria, Andes Coffee, Fundación Eco y otras 80+ marcas. Tenemos estudio propio, post propia, equipo de IA propio. Pero seguimos aceptando proyectos pequeños porque ahí pasan cosas interesantes.

Lo que no cambió: cada proyecto se trata como si fuera el único.`,
      mission:
        "Producir contenido audiovisual con criterio cinematográfico para marcas que entienden el valor de la imagen.",
      vision:
        "Ser el estudio de referencia en LATAM para producción audiovisual + IA aplicada con sensibilidad humana.",
      values: [
        {
          icon: "🎯",
          title: "Brief sagrado",
          desc: "Si no entendemos exactamente qué quieres, no arrancamos. Mejor una semana extra de pre que un mes de post arreglando.",
        },
        {
          icon: "⚡",
          title: "Tiempos cumplidos",
          desc: "Decimos 6 semanas, entregamos en 6 semanas. O en 5. Si vamos a tardar más, te lo decimos antes, no después.",
        },
        {
          icon: "🤝",
          title: "Cero sorpresas en factura",
          desc: "El presupuesto es cerrado. Si surge algo, lo cotizamos antes de hacerlo. No hay excepciones.",
        },
        {
          icon: "🎬",
          title: "Criterio sobre tecnología",
          desc: "Usamos lo último (IA, 8K, drones) cuando aporta. No por moda. La historia siempre va primero.",
        },
      ],
    },
  });
  console.log("  · About singleton");
}

async function seedServices() {
  // Actualizo los servicios existentes con detalles para /servicio/[slug]
  const updates = [
    {
      slug: "produccion-audiovisual",
      longDescription:
        "Producimos comerciales, branded content, videoclips y documentales con equipo cinema de gama alta. Desde la chispa creativa hasta el master final, cada decisión tiene criterio cinematográfico.",
      heroImageUrl: IMG.set,
      capabilities: [
        { icon: "🎬", title: "Comerciales TV/cine", desc: "Spots de 15s a 90s para canales tradicionales y digitales." },
        { icon: "📹", title: "Branded content", desc: "Historias de marca con narrativa cinematográfica." },
        { icon: "📽️", title: "Documental", desc: "Largometrajes y series con investigación propia." },
        { icon: "🎵", title: "Videoclips", desc: "Producción musical con equipo cinema." },
      ],
      process: [
        { step: "01", title: "Brief", desc: "Entendemos el objetivo y la marca a fondo." },
        { step: "02", title: "Tratamiento", desc: "Propuesta visual y narrativa con referencias." },
        { step: "03", title: "Pre-producción", desc: "Casting, locaciones, storyboard, PPM." },
        { step: "04", title: "Rodaje", desc: "1-5 días con equipo cinema 6K-8K." },
        { step: "05", title: "Post", desc: "Edit, color HDR, sound design, motion." },
        { step: "06", title: "Entrega", desc: "Versiones por canal en formatos optimizados." },
      ],
      pricing: "Desde $XXM COP por proyecto. Cotización personalizada según alcance.",
    },
    {
      slug: "fotografia",
      longDescription:
        "Sesiones editoriales, de producto, marca y campaña con luz, composición y dirección de arte cuidadas en cada disparo. Trabajamos con Phase One y formatos de medio formato cuando el proyecto lo pide.",
      heroImageUrl: IMG.editorial,
      capabilities: [
        { icon: "📷", title: "Producto", desc: "Catálogo, packshots, lifestyle." },
        { icon: "👗", title: "Editorial / moda", desc: "Sesiones para marcas y revistas." },
        { icon: "🏢", title: "Branding", desc: "Foto corporativa con criterio editorial." },
        { icon: "🎯", title: "Campaña", desc: "Producción completa con stylist y dirección de arte." },
      ],
      process: [
        { step: "01", title: "Mood board", desc: "Referencias y dirección visual definidas." },
        { step: "02", title: "Pre-producción", desc: "Stylist, locación, casting, props." },
        { step: "03", title: "Sesión", desc: "1-3 días según volumen." },
        { step: "04", title: "Selección", desc: "Selectos en 48-72h." },
        { step: "05", title: "Retoque", desc: "Retoque profesional, 5-10 días." },
        { step: "06", title: "Entrega", desc: "Master + cortes para web/social." },
      ],
      pricing: "Desde $XM COP por sesión. Día adicional cotizado aparte.",
    },
    {
      slug: "contenido-redes",
      longDescription:
        "Producción mensual sostenida de Reels, TikToks, Stories y Shorts con templates reutilizables y aprobaciones rápidas. Volumen alto sin perder calidad.",
      heroImageUrl: IMG.studio,
      capabilities: [
        { icon: "📱", title: "Reels / TikTok / Shorts", desc: "Volumen mensual con tiempos de aprobación rápidos." },
        { icon: "🎨", title: "Templates de motion", desc: "Sistema reutilizable para escala." },
        { icon: "📊", title: "Estrategia + producción", desc: "Calendario editorial integrado con producción." },
        { icon: "🤖", title: "IA aplicada", desc: "Voz sintética para variantes, generación de assets." },
      ],
      process: [
        { step: "01", title: "Calendario", desc: "Plan mensual de contenidos." },
        { step: "02", title: "Producción", desc: "1 día de rodaje al mes para batch." },
        { step: "03", title: "Edit", desc: "Templates aplicados, customización por pieza." },
        { step: "04", title: "Aprobación", desc: "Cliente aprueba en webapp con 1 click." },
        { step: "05", title: "Publicación", desc: "Entregamos archivos listos o gestionamos publicación." },
      ],
      pricing: "Plan mensual desde $XM COP por X piezas/mes.",
    },
    {
      slug: "ia-contenido",
      longDescription:
        "Integración de IA generativa en pipeline tradicional. Concept art con Midjourney, voiceover con ElevenLabs, B-roll generativo con Runway/Sora, edición asistida.",
      heroImageUrl: IMG.cinema,
      capabilities: [
        { icon: "🎨", title: "Concept art / preproducción", desc: "Mood boards y exploraciones visuales." },
        { icon: "🎙️", title: "Voiceover sintético", desc: "Voces multi-idioma indistinguibles." },
        { icon: "🎞️", title: "B-roll generativo", desc: "Shots imposibles o costosos vía IA." },
        { icon: "✂️", title: "Auto-edit asistido", desc: "Selectos automáticos como punto de partida." },
      ],
      process: [
        { step: "01", title: "Workflow design", desc: "Decidimos dónde aporta IA y dónde no." },
        { step: "02", title: "Generación", desc: "Producción de assets IA según necesidad." },
        { step: "03", title: "Composición", desc: "Integración con material tradicional." },
        { step: "04", title: "Refinamiento", desc: "Ajustes humanos sobre output IA." },
      ],
      pricing: "Cotización personalizada según el proyecto base.",
    },
    {
      slug: "livestreaming",
      longDescription:
        "Transmisiones en vivo broadcast multicámara para eventos corporativos, conciertos y conferencias. Hasta 12 inputs de audio, switching en vivo, gráficos del momento, multi-plataforma.",
      heroImageUrl: IMG.streaming,
      capabilities: [
        { icon: "📡", title: "Multi-plataforma", desc: "YouTube, Vimeo, Twitch, Facebook, RTMP custom." },
        { icon: "📷", title: "Multicámara", desc: "Hasta 8 cámaras con switching en vivo." },
        { icon: "🎤", title: "Audio profesional", desc: "Mesa de 16 canales, micros lavalier." },
        { icon: "🎨", title: "Gráficos en vivo", desc: "Lower thirds, transiciones, logos." },
      ],
      process: [
        { step: "01", title: "Plan técnico", desc: "Diagrama de señal, cámaras, audio." },
        { step: "02", title: "Pruebas", desc: "Día anterior: ensayo completo." },
        { step: "03", title: "Evento", desc: "Equipo en sitio + control room." },
        { step: "04", title: "Backup", desc: "Internet 4G de respaldo, equipo redundante." },
        { step: "05", title: "Entrega", desc: "Grabación master + cortes destacados." },
      ],
      pricing: "Desde $XM COP por evento (1 día). Multi-día con descuento.",
    },
    {
      slug: "post-produccion",
      longDescription:
        "Edición, color grading HDR, motion graphics y diseño sonoro. Pipeline DaVinci Resolve + After Effects + Pro Tools. Master 4K, entregas para todos los canales.",
      heroImageUrl: IMG.color,
      capabilities: [
        { icon: "✂️", title: "Edición", desc: "Largometraje, comercial, social, documental." },
        { icon: "🎨", title: "Color grading HDR", desc: "DaVinci Resolve, monitor HDR calibrado." },
        { icon: "✨", title: "Motion / VFX", desc: "After Effects, Cinema 4D, Nuke." },
        { icon: "🎵", title: "Sound design", desc: "Pro Tools, mezcla 5.1, sound design original." },
      ],
      process: [
        { step: "01", title: "Selectos", desc: "Mejor material en sync con guion." },
        { step: "02", title: "Rough cut", desc: "Primer corte para feedback." },
        { step: "03", title: "Fine cut", desc: "Refinamiento post-feedback." },
        { step: "04", title: "Picture lock", desc: "Cierre de imagen aprobado." },
        { step: "05", title: "Color + audio", desc: "En paralelo." },
        { step: "06", title: "Master", desc: "Versiones por canal." },
      ],
      pricing: "Desde $XM COP por proyecto.",
    },
  ];

  // Datos base de cada servicio (título/resumen/tags/orden). Antes vivían solo
  // en el seed demo (seed.ts), por lo que en producción los servicios no se
  // creaban y las páginas /servicio/[slug] daban 404. Ahora seed-public es
  // autosuficiente: hace upsert (crea si no existe + enriquece).
  const base: Record<
    string,
    { title: string; summary: string; content: string; order: number }
  > = {
    "produccion-audiovisual": {
      title: "Producción Audiovisual",
      summary:
        "Spots, documentales, branded content y videoclips con equipo cinema de gama alta.",
      content: "Spots,Documentales,Branded,Videoclips",
      order: 0,
    },
    fotografia: {
      title: "Fotografía",
      summary:
        "Fotografía de marca, producto y editorial. Luz, composición y dirección de arte en cada disparo.",
      content: "Producto,Editorial,Marca,Campaña",
      order: 1,
    },
    "contenido-redes": {
      title: "Contenido para Redes",
      summary:
        "Reels, Stories y TikToks nativos para cada plataforma. Estrategia + producción en volumen.",
      content: "Reels,TikTok,Shorts,Stories",
      order: 2,
    },
    "ia-contenido": {
      title: "IA Aplicada al Contenido",
      summary:
        "Integración de IA en guión, edición automática, voiceover sintético y generación de conceptos.",
      content: "Generativo,Voiceover IA,Auto-edit,Concept",
      order: 3,
    },
    livestreaming: {
      title: "Livestreaming",
      summary:
        "Transmisiones en vivo broadcast para eventos corporativos, conciertos y conferencias.",
      content: "Multicámara,Multicanal,Broadcast,Real-time",
      order: 4,
    },
    "post-produccion": {
      title: "Post-producción",
      summary:
        "Edición, color grading, motion graphics y diseño sonoro. El acabado final lo cambia todo.",
      content: "Edición,Color,Motion,Audio",
      order: 5,
    },
  };

  for (const u of updates) {
    const b = base[u.slug];
    const detail = {
      longDescription: u.longDescription,
      heroImageUrl: u.heroImageUrl,
      capabilities: u.capabilities,
      process: u.process,
      pricing: u.pricing,
    };
    await prisma.service.upsert({
      where: { slug: u.slug },
      update: detail,
      create: {
        slug: u.slug,
        title: b.title,
        summary: b.summary,
        content: b.content,
        order: b.order,
        visible: true,
        ...detail,
      },
    });
  }
  console.log("  · 6 servicios (base + detalle) creados/actualizados");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
