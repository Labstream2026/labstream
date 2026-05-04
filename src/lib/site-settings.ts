import { prisma } from "@/lib/prisma";

export type SiteSocials = {
  instagram?: string;
  vimeo?: string;
  youtube?: string;
  linkedin?: string;
};

export type SiteData = {
  siteName: string;
  tagline: string | null;
  contactEmail: string | null;
  logoUrl: string | null;
  faviconUrl: string | null;
  socials: SiteSocials;

  // Theming
  fontHeading: string;
  fontBody: string;
  colorPrimary: string;
  colorAccent: string;
  colorBg: string;
  colorText: string;
};

export async function getSiteSettings(): Promise<SiteData> {
  const s = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  return {
    siteName: s?.siteName ?? "Labstream Studio",
    tagline: s?.tagline ?? null,
    contactEmail: s?.contactEmail ?? null,
    logoUrl: s?.logoUrl ?? null,
    faviconUrl: s?.faviconUrl ?? null,
    socials: ((s?.socials as SiteSocials) ?? {}) as SiteSocials,

    fontHeading: s?.fontHeading ?? "Instrument Serif",
    fontBody: s?.fontBody ?? "Figtree",
    colorPrimary: s?.colorPrimary ?? "#E8640C",
    colorAccent: s?.colorAccent ?? "#7B61FF",
    colorBg: s?.colorBg ?? "#080808",
    colorText: s?.colorText ?? "#F0F0EE",
  };
}

/**
 * Devuelve la URL de Google Fonts para cargar las dos fuentes seleccionadas.
 */
export function buildGoogleFontsUrl(
  fontHeading: string,
  fontBody: string,
): string {
  const params = new URLSearchParams();
  const familyParam = (name: string, weights: string) =>
    `${name.replace(/ /g, "+")}:${weights}`;

  // Configs por fuente popular (italic+regular para headings; varios pesos para body)
  const headingFamily = familyParam(fontHeading, "ital@0;1");
  const bodyFamily = familyParam(fontBody, "wght@300;400;500;600;700");

  params.append("family", headingFamily);
  params.append("family", bodyFamily);
  params.append("display", "swap");

  return `https://fonts.googleapis.com/css2?${params.toString()}`;
}

export const FONT_OPTIONS = {
  heading: [
    "Instrument Serif",
    "Playfair Display",
    "Cormorant Garamond",
    "EB Garamond",
    "DM Serif Display",
    "Crimson Pro",
    "Libre Baskerville",
    "Lora",
    "Figtree",
    "Inter",
  ],
  body: [
    "Figtree",
    "Inter",
    "DM Sans",
    "Manrope",
    "Plus Jakarta Sans",
    "Outfit",
    "Work Sans",
    "Source Sans 3",
  ],
} as const;
