import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory } from "@prisma/client";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight } from "@/components/Icons";

export const metadata = {
  title: "Portafolio",
  description: "Trabajos seleccionados de Labstream Studio. Comerciales, documentales, fotografía, streaming y proyectos con IA.",
};

const CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  COMERCIAL: "Comercial",
  DOCUMENTAL: "Documental",
  FOTOGRAFIA: "Fotografía",
  STREAMING: "Streaming",
  BRANDED_CONTENT: "Branded Content",
  REDES_SOCIALES: "Redes",
  POST_PRODUCCION: "Post-producción",
  IA: "IA",
  OTRO: "Otro",
};

export default async function PortafolioPage(props: {
  searchParams: Promise<{ cat?: string }>;
}) {
  const sp = await props.searchParams;
  const activeCategory = sp.cat as PortfolioCategory | undefined;

  const projects = await prisma.portfolioProject.findMany({
    where: activeCategory ? { category: activeCategory } : {},
    orderBy: [{ featured: "desc" }, { order: "asc" }, { year: "desc" }],
  });

  const allCategories = await prisma.portfolioProject.findMany({
    select: { category: true },
    distinct: ["category"],
  });
  const availableCategories = allCategories.map((p) => p.category);

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/editorial.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.85) 60%, rgba(8,8,8,1) 100%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// Portafolio"}
            </p>
            <h1
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(48px,8vw,120px)",
                lineHeight: 0.92,
                letterSpacing: "-2px",
                maxWidth: "12ch",
              }}
            >
              Trabajos seleccionados
            </h1>
            <p className="mt-7 max-w-xl text-[16px] font-light text-white/75">
              Una muestra del trabajo reciente — entre cámara, código y conceptos.
            </p>
          </ScrollReveal>
        </div>
      </section>

      {/* Filtros */}
      <section className="px-6 py-6" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap gap-2">
            <Link
              href="/portafolio"
              className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                !activeCategory
                  ? "border-orange/40 bg-orange/10 text-orange"
                  : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
              }`}
            >
              Todos ({await prisma.portfolioProject.count()})
            </Link>
            {availableCategories.map((cat) => (
              <Link
                key={cat}
                href={`/portafolio?cat=${cat}`}
                className={`rounded-full border px-4 py-1.5 text-[13px] font-medium transition-colors ${
                  activeCategory === cat
                    ? "border-orange/40 bg-orange/10 text-orange"
                    : "border-white/10 text-white/65 hover:bg-white/5 hover:text-white"
                }`}
              >
                {CATEGORY_LABELS[cat]}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Grid de proyectos */}
      <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-6xl">
          {projects.length === 0 ? (
            <div className="text-center text-[14px] text-white/55 py-20">
              No hay proyectos en esta categoría aún.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((p, i) => (
                <ScrollReveal key={p.id} delay={(i % 3) * 0.07}>
                  <Link
                    href={`/portafolio/${p.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-white/5"
                  >
                    <div className="relative aspect-[4/3] overflow-hidden bg-black">
                      {p.coverImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={p.coverImageUrl}
                          alt={p.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      )}
                      <div
                        className="absolute inset-0"
                        style={{
                          background:
                            "linear-gradient(180deg, transparent 50%, rgba(0,0,0,0.85))",
                        }}
                      />
                      <div className="absolute bottom-0 left-0 right-0 p-5">
                        <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-orange">
                          <span className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5">
                            {CATEGORY_LABELS[p.category]}
                          </span>
                          <span>· {p.year}</span>
                        </div>
                        <h3
                          className="font-heading italic text-white"
                          style={{
                            fontSize: 22,
                            lineHeight: 1.1,
                          }}
                        >
                          {p.title}
                        </h3>
                        {p.client && (
                          <p className="mt-1 text-[12px] text-white/55">
                            {p.client}
                          </p>
                        )}
                      </div>
                      <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/0 transition-all group-hover:text-white" />
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </main>
  );
}
