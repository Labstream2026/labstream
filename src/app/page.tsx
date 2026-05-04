import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory } from "@prisma/client";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { HomeHero } from "@/components/public/HomeHero";
import { ClientLogos } from "@/components/public/ClientLogos";
import { Testimonials } from "@/components/public/Testimonials";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { AnimatedStat } from "@/components/public/AnimatedStat";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight, ChevronRight } from "@/components/Icons";

const PORTFOLIO_CATEGORY_LABELS: Record<PortfolioCategory, string> = {
  COMERCIAL: "Comercial",
  DOCUMENTAL: "Documental",
  FOTOGRAFIA: "Fotografía",
  STREAMING: "Streaming",
  BRANDED_CONTENT: "Branded",
  REDES_SOCIALES: "Redes",
  POST_PRODUCCION: "Post-producción",
  IA: "IA",
  OTRO: "Otro",
};

export default async function HomePage() {
  const [services, logos, testimonials, faqs, featuredProjects, latestPosts] =
    await Promise.all([
      prisma.service.findMany({
        where: { visible: true },
        orderBy: { order: "asc" },
      }),
      prisma.clientLogo.findMany({
        where: { visible: true },
        orderBy: { order: "asc" },
        take: 8,
      }),
      prisma.testimonial.findMany({
        where: { visible: true },
        orderBy: [{ featured: "desc" }, { order: "asc" }],
      }),
      prisma.faqItem.findMany({
        where: { visible: true },
        orderBy: { order: "asc" },
        take: 6,
      }),
      prisma.portfolioProject.findMany({
        where: { featured: true },
        orderBy: { order: "asc" },
        take: 4,
      }),
      prisma.blogPost.findMany({
        where: { status: "PUBLISHED" },
        orderBy: { publishedAt: "desc" },
        take: 3,
      }),
    ]);

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <HomeHero
        title="Narrativa que viaja más allá del ojo"
        subtitle="Producción audiovisual de vanguardia, fusionada con inteligencia artificial. Imágenes que definen marcas — extraordinarias y precisas."
        ctaPrimary={{ label: "Empieza tu proyecto", href: "/contacto" }}
        ctaSecondary={{ label: "Ver showreel", href: "/portafolio" }}
        backgroundVideo="https://assets.mixkit.co/videos/4842/4842-720.mp4"
        backgroundImage="https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&w=2400&q=80"
      />

      <ClientLogos logos={logos} />

      {/* Stats */}
      <section className="px-6 py-20" style={{ background: "var(--bg)" }}>
        <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
          <AnimatedStat value="12+" label="Años de experiencia" />
          <AnimatedStat value="340" label="Proyectos entregados" />
          <AnimatedStat value="80" label="Marcas confían" />
          <AnimatedStat value="6" label="Países en LATAM" />
        </div>
      </section>

      {/* Services grid */}
      <section
        id="services"
        className="px-6 py-24 md:py-32"
        style={{ background: "var(--bg-2)" }}
      >
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                // Servicios
              </p>
              <h2
                className="font-heading text-white"
                style={{
                  fontSize: "clamp(40px,5.5vw,72px)",
                  lineHeight: 1,
                  letterSpacing: "-1.5px",
                }}
              >
                Lo que <span className="italic">creamos</span>
              </h2>
              <p className="mx-auto mt-5 max-w-xl text-[15px] font-light text-white/70">
                Cada servicio es una especialidad. Juntos forman un ecosistema
                creativo completo.
              </p>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s, i) => {
              const tags = (s.content ?? "").split(",").filter(Boolean);
              return (
                <ScrollReveal key={s.id} delay={(i % 3) * 0.08}>
                  <Link
                    href={`/servicio/${s.slug}`}
                    className="lg group flex h-full flex-col overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:bg-white/[0.07]"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <h3
                        className="font-heading text-white"
                        style={{
                          fontSize: 28,
                          lineHeight: 1.1,
                          letterSpacing: "-0.5px",
                        }}
                      >
                        {s.title}
                      </h3>
                      <ArrowUpRight className="h-5 w-5 text-white/40 transition-all group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-orange" />
                    </div>
                    <p className="mb-6 text-[14px] font-light leading-relaxed text-white/70">
                      {s.summary}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5">
                      {tags.map((t) => (
                        <span
                          key={t}
                          className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/60"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </Link>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* Featured portfolio */}
      <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                  // Trabajos destacados
                </p>
                <h2
                  className="font-heading text-white"
                  style={{
                    fontSize: "clamp(40px,5.5vw,72px)",
                    lineHeight: 1,
                    letterSpacing: "-1.5px",
                  }}
                >
                  Algunos <span className="italic">proyectos</span> recientes
                </h2>
              </div>
              <Link
                href="/portafolio"
                className="flex items-center gap-2 text-[14px] font-medium text-orange hover:underline"
              >
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollReveal>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {featuredProjects.map((p, i) => (
              <ScrollReveal key={p.id} delay={(i % 2) * 0.1}>
                <Link
                  href={`/portafolio/${p.slug}`}
                  className="group block overflow-hidden rounded-3xl border border-white/5"
                >
                  <div className="relative aspect-[16/10] overflow-hidden bg-black">
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
                    <div className="absolute bottom-0 left-0 right-0 p-5 md:p-6">
                      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-widest text-orange">
                        <span className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5">
                          {PORTFOLIO_CATEGORY_LABELS[p.category]}
                        </span>
                        <span>· {p.year}</span>
                        {p.client && <span className="text-white/50">· {p.client}</span>}
                      </div>
                      <h3
                        className="font-heading italic text-white"
                        style={{
                          fontSize: "clamp(22px,2.4vw,30px)",
                          lineHeight: 1.1,
                        }}
                      >
                        {p.title}
                      </h3>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <Testimonials items={testimonials} />

      {/* Process */}
      <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="mb-14 text-center">
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                // Proceso
              </p>
              <h2
                className="font-heading text-white"
                style={{
                  fontSize: "clamp(40px,5.5vw,72px)",
                  lineHeight: 1,
                  letterSpacing: "-1.5px",
                }}
              >
                De la idea <span className="italic">a la pantalla</span>
              </h2>
            </div>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            {[
              { n: "01", t: "Briefing", d: "Escuchamos tu visión y objetivos." },
              { n: "02", t: "Concepto", d: "Tratamiento creativo concreto." },
              { n: "03", t: "Producción", d: "Capturamos con criterio cinema." },
              { n: "04", t: "Post", d: "Edit, color, motion, audio." },
              { n: "05", t: "Entrega", d: "Versiones para cada canal." },
            ].map((s, i) => (
              <ScrollReveal key={s.n} delay={i * 0.06}>
                <div className="lg flex h-full flex-col rounded-2xl p-6">
                  <div
                    className="mb-3 font-heading italic"
                    style={{
                      fontSize: 36,
                      color: "var(--orange)",
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </div>
                  <h3 className="mb-2 text-[16px] font-semibold text-white">
                    {s.t}
                  </h3>
                  <p className="text-[13px] font-light leading-relaxed text-white/65">
                    {s.d}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Latest blog posts */}
      {latestPosts.length > 0 && (
        <section className="px-6 py-24" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                    // Blog
                  </p>
                  <h2
                    className="font-heading text-white"
                    style={{
                      fontSize: "clamp(36px,4.5vw,56px)",
                      lineHeight: 1.05,
                      letterSpacing: "-1px",
                    }}
                  >
                    Lo último del <span className="italic">blog</span>
                  </h2>
                </div>
                <Link
                  href="/blog"
                  className="flex items-center gap-2 text-[14px] font-medium text-orange hover:underline"
                >
                  Ver todos <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {latestPosts.map((post, i) => (
                <ScrollReveal key={post.id} delay={(i % 3) * 0.08}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group block overflow-hidden rounded-2xl border border-white/5 bg-white/[0.02] transition-all hover:-translate-y-1 hover:border-white/15"
                  >
                    {post.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={post.coverImageUrl}
                        alt={post.title}
                        className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="p-5">
                      {post.category && (
                        <p className="mb-2 text-[10px] uppercase tracking-widest text-orange">
                          {post.category}
                        </p>
                      )}
                      <h3 className="mb-2 text-[17px] font-semibold leading-snug text-white">
                        {post.title}
                      </h3>
                      {post.excerpt && (
                        <p className="text-[13px] leading-relaxed text-white/60 line-clamp-3">
                          {post.excerpt}
                        </p>
                      )}
                      <div className="mt-3 text-[11px] text-white/40">
                        {post.authorName} · {post.readMinutes ?? 5} min
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <FaqAccordion items={faqs} />

      {/* CTA final */}
      <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              // ¿Empezamos?
            </p>
            <h2
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(40px,6vw,80px)",
                lineHeight: 1.05,
                letterSpacing: "-1.5px",
              }}
            >
              Cuéntanos tu próximo proyecto
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] font-light text-white/70">
              Respondemos en menos de 24 horas. La primera conversación es gratis y
              te dejamos un brief con criterio independiente.
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href="/contacto" className="btn-primary">
                Hablemos <ArrowUpRight />
              </Link>
              <Link
                href="/portafolio"
                className="rounded-full border border-white/15 px-6 py-3 text-[14px] font-medium text-white/85 hover:bg-white/5 hover:text-white"
              >
                Ver portafolio
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
