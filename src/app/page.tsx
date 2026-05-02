import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/public/Navbar";
import { Hero } from "@/components/public/Hero";
import { Services } from "@/components/public/Services";
import { Process } from "@/components/public/Process";
import { Contact } from "@/components/public/Contact";
import { Footer } from "@/components/public/Footer";
import { BlockRenderer } from "@/components/public/Blocks";

type HeroData = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
};

type StatsData = { items: { value: string; label: string }[] };

export default async function HomePage() {
  const [home, services] = await Promise.all([
    prisma.page.findUnique({
      where: { slug: "home" },
      include: { blocks: { orderBy: { order: "asc" } } },
    }),
    prisma.service.findMany({
      where: { visible: true },
      orderBy: { order: "asc" },
    }),
  ]);

  const heroBlock = home?.blocks.find((b) => b.type === "hero");
  const statsBlock = home?.blocks.find((b) => b.type === "stats");
  const extraBlocks =
    home?.blocks.filter(
      (b) => b.type !== "hero" && b.type !== "stats" && b.visible,
    ) ?? [];

  const heroData = (heroBlock?.data as HeroData | undefined) ?? {};
  const stats = (statsBlock?.data as StatsData | undefined)?.items ?? [];

  return (
    <main>
      <Navbar />
      <Hero
        headline={heroData.title ?? "Narrativa que viaja más allá del ojo"}
        subtitle={
          heroData.subtitle ??
          "Producción audiovisual de vanguardia, fusionada con inteligencia artificial. Imágenes que definen marcas — extraordinarias y precisas."
        }
        badgeText={
          heroData.eyebrow ?? "Showreel 2026 · Producción potenciada por IA"
        }
        ctaPrimary={{
          label: heroData.ctaLabel || "Empieza tu proyecto",
          href: heroData.ctaHref || "/#contact",
        }}
        ctaSecondary={
          heroData.secondaryLabel
            ? {
                label: heroData.secondaryLabel,
                href: heroData.secondaryHref || "#",
              }
            : { label: "Ver Showreel", href: "#" }
        }
        stats={
          stats.length > 0
            ? stats.map((s) => ({ num: s.value, label: s.label }))
            : [
                { num: "12+", label: "Años en producción audiovisual" },
                { num: "340", label: "Proyectos entregados globalmente" },
              ]
        }
        partnersLabel="Aliados con marcas líderes en LATAM y el mundo"
        partners={["Aurora", "Vela", "Apex", "Norte", "Zeno"]}
      />
      <Services services={services} />
      {extraBlocks.map((b) => (
        <BlockRenderer key={b.id} block={b} />
      ))}
      <Process />
      <Contact />
      <Footer />
    </main>
  );
}
