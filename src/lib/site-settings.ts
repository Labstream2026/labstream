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
  socials: SiteSocials;
};

export async function getSiteSettings(): Promise<SiteData> {
  const s = await prisma.siteSettings.findUnique({
    where: { id: "singleton" },
  });
  return {
    siteName: s?.siteName ?? "Labstream Studio",
    tagline: s?.tagline ?? null,
    contactEmail: s?.contactEmail ?? null,
    socials: ((s?.socials as SiteSocials) ?? {}) as SiteSocials,
  };
}
