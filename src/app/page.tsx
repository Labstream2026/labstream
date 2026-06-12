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
import {
  isPreviewMode,
  mergeDraft,
  getCollectionDraft,
  orderCollectionDraft,
} from "@/lib/preview";
import { resolveHome } from "@/lib/home-defaults";
import { ThemePreviewStyle } from "@/components/cms/ThemePreviewStyle";

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

export default async function HomePage(props: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const preview = await isPreviewMode(await props.searchParams);

  const [
    homeRecord,
    services,
    logos,
    testimonials,
    faqs,
    featuredProjects,
    latestPosts,
  ] = await Promise.all([
      prisma.homeContent.upsert({
        where: { id: "singleton" },
        update: {},
        create: { id: "singleton" },
      }),
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

  // Contenido editable de la home (con fallback a los defaults). En preview,
  // mergea el borrador en vivo encima.
  const home = resolveHome(
    preview ? mergeDraft(homeRecord, homeRecord.draft) : homeRecord,
  );

  // En preview, si hay borrador de estas colecciones, las usamos en vez de lo
  // publicado (mismo filtro/orden/tope que el query original).
  let logosView = logos;
  let testimonialsView = testimonials;
  let faqsView = faqs;
  if (preview) {
    const [logoDraft, testiDraft, faqDraft] = await Promise.all([
      getCollectionDraft("logos"),
      getCollectionDraft("testimonials"),
      getCollectionDraft("faqs"),
    ]);
    if (logoDraft)
      logosView = orderCollectionDraft(logoDraft, { take: 8 }) as typeof logos;
    if (testiDraft)
      testimonialsView = orderCollectionDraft(testiDraft, {
        featured: true,
      }) as typeof testimonials;
    if (faqDraft)
      faqsView = orderCollectionDraft(faqDraft, { take: 6 }) as typeof faqs;
  }

  return (
    <main>
      {preview ? <ThemePreviewStyle /> : null}
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <HomeHero
        badge={{ tag: home.heroBadgeTag, text: home.heroBadgeText }}
        title={home.heroTitle}
        subtitle={home.heroSubtitle}
        ctaPrimary={{
          label: home.heroCtaPrimaryLabel,
          href: home.heroCtaPrimaryHref,
        }}
        ctaSecondary={{
          label: home.heroCtaSecondaryLabel,
          href: home.heroCtaSecondaryHref,
        }}
        backgroundVideo={home.heroBackgroundVideo}
        backgroundImage={home.heroBackgroundImage}
      />

      <ClientLogos logos={logosView} />

      {/* Stats */}
      {home.stats.length > 0 && (
        <section className="px-6 py-20" style={{ background: "var(--bg)" }}>
          <div className="mx-auto grid max-w-5xl grid-cols-2 gap-4 md:grid-cols-4">
            {home.stats.map((stat, i) => (
              <AnimatedStat key={i} value={stat.value} label={stat.label} />
            ))}
          </div>
        </section>
      )}

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
                {"// Servicios"}
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
                  {"// Trabajos destacados"}
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
      <Testimonials items={testimonialsView} />

      {/* Process */}
      {home.processSteps.length > 0 && (
        <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="mb-14 text-center">
                <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                  {"// "}
                  {home.processEyebrow}
                </p>
                <h2
                  className="font-heading text-white"
                  style={{
                    fontSize: "clamp(40px,5.5vw,72px)",
                    lineHeight: 1,
                    letterSpacing: "-1.5px",
                  }}
                >
                  {home.processTitle}
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
              {home.processSteps.map((s, i) => (
                <ScrollReveal key={i} delay={i * 0.06}>
                  <div className="lg flex h-full flex-col rounded-2xl p-6">
                    <div
                      className="mb-3 font-heading italic"
                      style={{
                        fontSize: 36,
                        color: "var(--orange)",
                        lineHeight: 1,
                      }}
                    >
                      {s.step}
                    </div>
                    <h3 className="mb-2 text-[16px] font-semibold text-white">
                      {s.title}
                    </h3>
                    <p className="text-[13px] font-light leading-relaxed text-white/65">
                      {s.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Latest blog posts */}
      {latestPosts.length > 0 && (
        <section className="px-6 py-24" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="mb-12 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                    {"// Blog"}
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
      <FaqAccordion items={faqsView} />

      {/* CTA final */}
      <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// "}
              {home.ctaEyebrow}
            </p>
            <h2
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(40px,6vw,80px)",
                lineHeight: 1.05,
                letterSpacing: "-1.5px",
              }}
            >
              {home.ctaTitle}
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] font-light text-white/70">
              {home.ctaSubtitle}
            </p>
            <div className="mt-9 flex flex-wrap justify-center gap-3">
              <Link href={home.ctaPrimaryHref} className="btn-primary">
                {home.ctaPrimaryLabel} <ArrowUpRight />
              </Link>
              <Link
                href={home.ctaSecondaryHref}
                className="rounded-full border border-white/15 px-6 py-3 text-[14px] font-medium text-white/85 hover:bg-white/5 hover:text-white"
              >
                {home.ctaSecondaryLabel}
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
