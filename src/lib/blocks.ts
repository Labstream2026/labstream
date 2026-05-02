import { z } from "zod";

export const BLOCK_TYPES = [
  "hero",
  "stats",
  "richText",
  "gallery",
  "videoEmbed",
  "cta",
  "featureList",
  "image",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const blockSchemas = {
  hero: z.object({
    eyebrow: z.string().optional().default(""),
    title: z.string().default(""),
    subtitle: z.string().optional().default(""),
    ctaLabel: z.string().optional().default(""),
    ctaHref: z.string().optional().default(""),
    secondaryLabel: z.string().optional().default(""),
    secondaryHref: z.string().optional().default(""),
  }),

  stats: z.object({
    items: z
      .array(z.object({ value: z.string(), label: z.string() }))
      .default([]),
  }),

  richText: z.object({
    eyebrow: z.string().optional().default(""),
    heading: z.string().optional().default(""),
    body: z.string().default(""),
    align: z.enum(["left", "center"]).default("left"),
  }),

  gallery: z.object({
    eyebrow: z.string().optional().default(""),
    heading: z.string().optional().default(""),
    images: z
      .array(
        z.object({
          url: z.string().url(),
          alt: z.string().optional().default(""),
          caption: z.string().optional().default(""),
        }),
      )
      .default([]),
    columns: z.number().int().min(1).max(4).default(3),
  }),

  videoEmbed: z.object({
    eyebrow: z.string().optional().default(""),
    heading: z.string().optional().default(""),
    url: z.string().url(),
    caption: z.string().optional().default(""),
  }),

  cta: z.object({
    eyebrow: z.string().optional().default(""),
    title: z.string().default(""),
    body: z.string().optional().default(""),
    ctaLabel: z.string().default(""),
    ctaHref: z.string().default(""),
  }),

  featureList: z.object({
    eyebrow: z.string().optional().default(""),
    heading: z.string().optional().default(""),
    items: z
      .array(
        z.object({
          icon: z.string().optional().default(""),
          title: z.string(),
          desc: z.string().optional().default(""),
        }),
      )
      .default([]),
    columns: z.number().int().min(1).max(4).default(3),
  }),

  image: z.object({
    url: z.string().url(),
    alt: z.string().optional().default(""),
    caption: z.string().optional().default(""),
    fullWidth: z.boolean().default(false),
  }),
};

export const BLOCK_LABELS: Record<BlockType, string> = {
  hero: "Hero",
  stats: "Estadísticas",
  richText: "Texto enriquecido",
  gallery: "Galería de imágenes",
  videoEmbed: "Video embed",
  cta: "Llamada a la acción",
  featureList: "Lista de características",
  image: "Imagen",
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  hero: "Encabezado grande con título, subtítulo y botones",
  stats: "Tarjetas con números destacados",
  richText: "Párrafos de texto con encabezado opcional",
  gallery: "Cuadrícula de imágenes con leyendas",
  videoEmbed: "Video de YouTube o Vimeo",
  cta: "Banner con título y botón principal",
  featureList: "Lista de items con título y descripción",
  image: "Una imagen con leyenda opcional",
};

export const BLOCK_DEFAULTS: Record<BlockType, Record<string, unknown>> = {
  hero: {
    eyebrow: "",
    title: "Nuevo título",
    subtitle: "",
    ctaLabel: "",
    ctaHref: "",
    secondaryLabel: "",
    secondaryHref: "",
  },
  stats: {
    items: [
      { value: "10+", label: "Años de experiencia" },
      { value: "100", label: "Proyectos entregados" },
    ],
  },
  richText: {
    eyebrow: "",
    heading: "Nuestro enfoque",
    body: "Escribe aquí el contenido del párrafo. Puedes usar varias líneas — cada doble salto se vuelve un párrafo nuevo.",
    align: "left",
  },
  gallery: {
    eyebrow: "",
    heading: "Galería",
    images: [],
    columns: 3,
  },
  videoEmbed: {
    eyebrow: "",
    heading: "",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    caption: "",
  },
  cta: {
    eyebrow: "",
    title: "Listo para empezar",
    body: "Cuéntanos tu proyecto y empezamos hoy mismo.",
    ctaLabel: "Hablemos",
    ctaHref: "/#contact",
  },
  featureList: {
    eyebrow: "",
    heading: "Lo que nos hace diferentes",
    items: [
      { icon: "🎬", title: "Producción premium", desc: "Equipos de cine y dirección con criterio." },
      { icon: "⚡", title: "Tiempos rápidos", desc: "De la idea al máster sin perder calidad." },
      { icon: "🌐", title: "Multiplataforma", desc: "Cortes optimizados para cada canal." },
    ],
    columns: 3,
  },
  image: {
    url: "",
    alt: "",
    caption: "",
    fullWidth: false,
  },
};

export function isBlockType(s: string): s is BlockType {
  return (BLOCK_TYPES as readonly string[]).includes(s);
}

export function parseBlockData<T extends BlockType>(
  type: T,
  raw: unknown,
): Record<string, unknown> {
  const schema = blockSchemas[type];
  const parsed = schema.safeParse(raw);
  if (parsed.success) return parsed.data as Record<string, unknown>;
  return BLOCK_DEFAULTS[type];
}

export function youtubeOrVimeoEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname.includes("youtu.be")) {
      let id = "";
      if (u.hostname.includes("youtu.be")) {
        id = u.pathname.slice(1);
      } else if (u.searchParams.has("v")) {
        id = u.searchParams.get("v") ?? "";
      } else if (u.pathname.startsWith("/embed/")) {
        id = u.pathname.split("/")[2] ?? "";
      }
      if (!id) return null;
      return `https://www.youtube.com/embed/${id}`;
    }
    if (u.hostname.includes("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean)[0];
      if (!id) return null;
      return `https://player.vimeo.com/video/${id}`;
    }
    return null;
  } catch {
    return null;
  }
}
