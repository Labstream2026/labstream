import { z } from "zod";
import {
  PortfolioCategory,
  BlogPostStatus,
  LeadStatus,
  ProposalStatus,
} from "@prisma/client";

// ─── Reusable atoms ────────────────────────────────────────────────

const trimmedString = z.string().trim();

/** Required string with min length 1 and friendly message. */
function required(label: string, min = 1) {
  return trimmedString.min(min, { message: `${label} es obligatorio.` });
}

/** Optional string that converts empty to null. */
const optionalString = trimmedString
  .optional()
  .transform((v) => (v && v.length > 0 ? v : null));

/** Slug: lowercase letters, numbers, hyphens; auto-normalized. */
const slug = trimmedString
  .min(1, { message: "El slug es obligatorio." })
  .transform((v) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, "-")
      .replace(/^-+|-+$/g, ""),
  )
  .refine((v) => v.length > 0, { message: "El slug no puede quedar vacío." });

const tagsCsv = trimmedString
  .optional()
  .transform((v) =>
    v
      ? v
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
      : [],
  );

const intOrDefault = (defaultValue: number) =>
  z.preprocess(
    (v) => {
      const n = parseInt(String(v ?? ""), 10);
      return Number.isFinite(n) ? n : defaultValue;
    },
    z.number(),
  );

const intOrNull = z.preprocess(
  (v) => {
    const n = parseInt(String(v ?? ""), 10);
    return Number.isFinite(n) ? n : null;
  },
  z.number().nullable(),
);

const checkbox = z.preprocess((v) => v === "on" || v === true, z.boolean());

/** Parses an <input type="date"> value to a Date, or null if empty/invalid. */
const dateOrNull = z.preprocess((v) => {
  if (typeof v !== "string" || !v.trim()) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}, z.date().nullable());

/** Parses a JSON array from a string field; returns [] on any failure. */
const jsonArray = z.preprocess(
  (v) => {
    if (typeof v !== "string" || !v.trim()) return [];
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  z.array(z.record(z.string(), z.unknown())),
);

// ─── Models ────────────────────────────────────────────────────────

export const portfolioSchema = z.object({
  title: required("El título"),
  slug,
  client: optionalString,
  category: z.nativeEnum(PortfolioCategory).default(PortfolioCategory.COMERCIAL),
  year: intOrDefault(new Date().getFullYear()),
  excerpt: optionalString,
  brief: optionalString,
  process: optionalString,
  result: optionalString,
  coverImageUrl: optionalString,
  videoUrl: optionalString,
  galleryImages: jsonArray,
  beforeAfter: jsonArray,
  credits: jsonArray,
  tags: tagsCsv,
  featured: checkbox,
  order: intOrDefault(0),
});

export const portfolioCreateSchema = z.object({
  title: required("El título"),
  slug,
  client: optionalString,
  year: intOrDefault(new Date().getFullYear()),
  category: z.nativeEnum(PortfolioCategory).default(PortfolioCategory.COMERCIAL),
});

export const blogSchema = z.object({
  title: required("El título"),
  slug,
  excerpt: optionalString,
  content: trimmedString.default(""),
  coverImageUrl: optionalString,
  authorName: optionalString,
  authorRole: optionalString,
  category: optionalString,
  tags: tagsCsv,
  status: z.nativeEnum(BlogPostStatus).default(BlogPostStatus.DRAFT),
  readMinutes: intOrNull,
});

export const blogCreateSchema = z.object({
  title: required("El título"),
  slug,
  category: optionalString,
});

export const serviceDetailSchema = z.object({
  longDescription: optionalString,
  heroImageUrl: optionalString,
  pricing: optionalString,
  capabilities: jsonArray,
  process: jsonArray,
});

export const aboutSchema = z.object({
  heroEyebrow: optionalString,
  heroTitle: optionalString,
  heroSubtitle: optionalString,
  story: optionalString,
  mission: optionalString,
  vision: optionalString,
  values: jsonArray,
});

export const homeSchema = z.object({
  // Hero
  heroBadgeTag: optionalString,
  heroBadgeText: optionalString,
  heroTitle: optionalString,
  heroSubtitle: optionalString,
  heroCtaPrimaryLabel: optionalString,
  heroCtaPrimaryHref: optionalString,
  heroCtaSecondaryLabel: optionalString,
  heroCtaSecondaryHref: optionalString,
  heroBackgroundImage: optionalString,
  heroBackgroundVideo: optionalString,
  // Estadísticas
  stats: jsonArray,
  // Proceso
  processEyebrow: optionalString,
  processTitle: optionalString,
  processSteps: jsonArray,
  // CTA final
  ctaEyebrow: optionalString,
  ctaTitle: optionalString,
  ctaSubtitle: optionalString,
  ctaPrimaryLabel: optionalString,
  ctaPrimaryHref: optionalString,
  ctaSecondaryLabel: optionalString,
  ctaSecondaryHref: optionalString,
});

export const leadStatusSchema = z.object({
  id: required("El id"),
  status: z.nativeEnum(LeadStatus),
});

export const proposalCreateSchema = z.object({
  title: required("El título"),
  clientName: required("El nombre del cliente"),
  code: optionalString,
});

export const proposalSchema = z.object({
  // Cabecera
  title: required("El título"),
  slug,
  code: optionalString,
  status: z.nativeEnum(ProposalStatus).default(ProposalStatus.DRAFT),
  clientName: required("El nombre del cliente"),
  clientContact: optionalString,
  clientEmail: optionalString,
  preparedBy: optionalString,

  // Portada
  coverImageUrl: optionalString,
  tagline: optionalString,
  intro: optionalString,

  // Historia / track record
  aboutHeading: optionalString,
  aboutBody: optionalString,
  stats: jsonArray,
  selectedWork: jsonArray,

  // Tratamiento creativo
  treatmentHeading: optionalString,
  treatmentBody: optionalString,
  treatmentSections: jsonArray,
  moodboard: jsonArray,
  references: jsonArray,

  // Cronograma + entregables
  timeline: jsonArray,
  deliverables: jsonArray,

  // Presupuesto
  currency: trimmedString.default("COP"),
  budgetItems: jsonArray,
  budgetNote: optionalString,
  taxRatePct: intOrNull,
  showPrices: checkbox,

  // Cierre
  ctaHeading: optionalString,
  ctaBody: optionalString,
  validUntil: dateOrNull,
  accentColor: optionalString,
});

// ─── Helper to extract errors → field-name map ──────────────────────

export type FieldErrors = Record<string, string>;

export function parseForm<T extends z.ZodTypeAny>(
  schema: T,
  formData: FormData,
): { ok: true; data: z.output<T> } | { ok: false; errors: FieldErrors } {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of formData.entries()) {
    // Skip the conventional `id` key — server actions handle it separately.
    if (k === "id") continue;
    obj[k] = typeof v === "string" ? v : v;
  }
  const result = schema.safeParse(obj);
  if (result.success) return { ok: true, data: result.data };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const path = issue.path[0];
    if (typeof path === "string" && !errors[path]) {
      errors[path] = issue.message;
    }
  }
  return { ok: false, errors };
}

/**
 * Convert FieldErrors to a single human-readable message for the toast.
 */
export function summarizeErrors(errors: FieldErrors): string {
  const fields = Object.keys(errors);
  if (fields.length === 0) return "Hay errores en el formulario.";
  if (fields.length === 1) return errors[fields[0]];
  return `Revisa ${fields.length} campos del formulario.`;
}
