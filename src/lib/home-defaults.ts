import type { HomeContent } from "@prisma/client";

export type HomeStat = { value: string; label: string };
export type HomeStep = { step: string; title: string; desc: string };

/**
 * Valores por defecto de la home (lo que antes estaba hardcodeado en
 * src/app/page.tsx). Se usan como: fallback público si un campo está vacío,
 * placeholders/valores iniciales del editor del CMS, y datos del seed.
 */
export const HOME_DEFAULTS = {
  heroBadgeTag: "2026",
  heroBadgeText: "Producción audiovisual + IA",
  heroTitle: "Narrativa que viaja más allá del ojo",
  heroSubtitle:
    "Producción audiovisual de vanguardia, fusionada con inteligencia artificial. Imágenes que definen marcas — extraordinarias y precisas.",
  heroCtaPrimaryLabel: "Empieza tu proyecto",
  heroCtaPrimaryHref: "/contacto",
  heroCtaSecondaryLabel: "Ver showreel",
  heroCtaSecondaryHref: "/portafolio",
  heroBackgroundImage: "/media/hero-cinema.jpg",
  heroBackgroundVideo: "/media/hero.mp4",
  stats: [
    { value: "12+", label: "Años de experiencia" },
    { value: "340", label: "Proyectos entregados" },
    { value: "80", label: "Marcas confían" },
    { value: "6", label: "Países en LATAM" },
  ] as HomeStat[],
  processEyebrow: "Proceso",
  processTitle: "De la idea a la pantalla",
  processSteps: [
    { step: "01", title: "Briefing", desc: "Escuchamos tu visión y objetivos." },
    { step: "02", title: "Concepto", desc: "Tratamiento creativo concreto." },
    { step: "03", title: "Producción", desc: "Capturamos con criterio cinema." },
    { step: "04", title: "Post", desc: "Edit, color, motion, audio." },
    { step: "05", title: "Entrega", desc: "Versiones para cada canal." },
  ] as HomeStep[],
  ctaEyebrow: "¿Empezamos?",
  ctaTitle: "Cuéntanos tu próximo proyecto",
  ctaSubtitle:
    "Respondemos en menos de 24 horas. La primera conversación es gratis y te dejamos un brief con criterio independiente.",
  ctaPrimaryLabel: "Hablemos",
  ctaPrimaryHref: "/contacto",
  ctaSecondaryLabel: "Ver portafolio",
  ctaSecondaryHref: "/portafolio",
};

/** Toma un campo string del registro y cae al default si está vacío. */
function s(v: string | null | undefined, fallback: string): string {
  const t = (v ?? "").trim();
  return t.length > 0 ? t : fallback;
}

/**
 * Resuelve el contenido de la home combinando el registro de BD (posiblemente
 * con campos vacíos o un draft ya mergeado) con los valores por defecto.
 * Devuelve un objeto totalmente poblado y listo para renderizar.
 */
export function resolveHome(record: Partial<HomeContent> | null) {
  const r = record ?? {};
  const stats = Array.isArray(r.stats) && r.stats.length > 0
    ? (r.stats as HomeStat[])
    : HOME_DEFAULTS.stats;
  const processSteps =
    Array.isArray(r.processSteps) && r.processSteps.length > 0
      ? (r.processSteps as HomeStep[])
      : HOME_DEFAULTS.processSteps;

  return {
    heroBadgeTag: s(r.heroBadgeTag, HOME_DEFAULTS.heroBadgeTag),
    heroBadgeText: s(r.heroBadgeText, HOME_DEFAULTS.heroBadgeText),
    heroTitle: s(r.heroTitle, HOME_DEFAULTS.heroTitle),
    heroSubtitle: s(r.heroSubtitle, HOME_DEFAULTS.heroSubtitle),
    heroCtaPrimaryLabel: s(r.heroCtaPrimaryLabel, HOME_DEFAULTS.heroCtaPrimaryLabel),
    heroCtaPrimaryHref: s(r.heroCtaPrimaryHref, HOME_DEFAULTS.heroCtaPrimaryHref),
    heroCtaSecondaryLabel: s(r.heroCtaSecondaryLabel, HOME_DEFAULTS.heroCtaSecondaryLabel),
    heroCtaSecondaryHref: s(r.heroCtaSecondaryHref, HOME_DEFAULTS.heroCtaSecondaryHref),
    // Para imagen/video respetamos el vacío explícito solo si el otro existe;
    // si ambos vacíos, usamos los defaults para no dejar el hero en negro.
    heroBackgroundImage: s(r.heroBackgroundImage, HOME_DEFAULTS.heroBackgroundImage),
    heroBackgroundVideo: s(r.heroBackgroundVideo, HOME_DEFAULTS.heroBackgroundVideo),
    stats,
    processEyebrow: s(r.processEyebrow, HOME_DEFAULTS.processEyebrow),
    processTitle: s(r.processTitle, HOME_DEFAULTS.processTitle),
    processSteps,
    ctaEyebrow: s(r.ctaEyebrow, HOME_DEFAULTS.ctaEyebrow),
    ctaTitle: s(r.ctaTitle, HOME_DEFAULTS.ctaTitle),
    ctaSubtitle: s(r.ctaSubtitle, HOME_DEFAULTS.ctaSubtitle),
    ctaPrimaryLabel: s(r.ctaPrimaryLabel, HOME_DEFAULTS.ctaPrimaryLabel),
    ctaPrimaryHref: s(r.ctaPrimaryHref, HOME_DEFAULTS.ctaPrimaryHref),
    ctaSecondaryLabel: s(r.ctaSecondaryLabel, HOME_DEFAULTS.ctaSecondaryLabel),
    ctaSecondaryHref: s(r.ctaSecondaryHref, HOME_DEFAULTS.ctaSecondaryHref),
  };
}
