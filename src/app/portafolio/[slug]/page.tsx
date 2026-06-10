import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PortfolioCategory } from "@prisma/client";
import { isPreviewMode, mergeDraft } from "@/lib/preview";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { BeforeAfterSlider } from "@/components/public/BeforeAfterSlider";
import { ArrowUpRight, ChevronRight } from "@/components/Icons";
import {
  detectEmbedKind,
  driveFilePreviewIframeUrl,
  vimeoEmbedUrl,
  youtubeEmbedUrl,
  extractDriveFileId,
  extractVimeoId,
  extractYouTubeId,
} from "@/lib/google-drive";
import { EmbedKind } from "@prisma/client";

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

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const p = await prisma.portfolioProject.findUnique({ where: { slug } });
  if (!p) return { title: "Proyecto no encontrado" };
  return {
    title: p.title,
    description: p.excerpt ?? undefined,
    openGraph: { images: p.coverImageUrl ? [p.coverImageUrl] : [] },
  };
}

export default async function ProjectDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const preview = await isPreviewMode(sp);
  const found = await prisma.portfolioProject.findUnique({ where: { slug } });
  if (!found) notFound();
  const project = preview ? mergeDraft(found, found.draft) : found;

  const others = await prisma.portfolioProject.findMany({
    where: { id: { not: project.id }, category: project.category },
    take: 3,
    orderBy: { order: "asc" },
  });

  const gallery =
    (project.galleryImages as Array<{ url: string; alt?: string; caption?: string }> | null) ?? [];
  const beforeAfter =
    (project.beforeAfter as Array<{ before: string; after: string; label?: string }> | null) ?? [];
  const credits =
    (project.credits as Array<{ role: string; name: string }> | null) ?? [];

  const videoEmbed = project.videoUrl ? buildVideoEmbed(project.videoUrl) : null;

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      {/* Hero del proyecto */}
      <section className="relative overflow-hidden">
        <div className="relative h-[80vh] min-h-[500px]">
          {project.coverImageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={project.coverImageUrl}
              alt={project.title}
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
          )}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.95) 100%)",
            }}
          />
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-12 md:pb-16">
            <div className="mx-auto max-w-6xl">
              <Link
                href="/portafolio"
                className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-white/70 hover:text-orange"
              >
                ← Volver al portafolio
              </Link>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-widest text-orange">
                <span className="rounded-full border border-orange/40 bg-orange/10 px-2 py-0.5">
                  {CATEGORY_LABELS[project.category]}
                </span>
                <span>· {project.year}</span>
                {project.client && (
                  <span className="text-white/55">· {project.client}</span>
                )}
              </div>
              <h1
                className="font-heading italic text-white"
                style={{
                  fontSize: "clamp(40px,7vw,96px)",
                  lineHeight: 0.95,
                  letterSpacing: "-2px",
                  maxWidth: "16ch",
                }}
              >
                {project.title}
              </h1>
              {project.excerpt && (
                <p className="mt-5 max-w-2xl text-[16px] font-light text-white/80 md:text-[18px]">
                  {project.excerpt}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Brief / Proceso / Resultado */}
      <section className="px-6 py-20" style={{ background: "var(--bg)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
          {project.brief && (
            <ScrollReveal>
              <p className="mb-3 text-[11px] font-mono tracking-widest text-orange">
                {"// El brief"}
              </p>
              <p className="text-[14px] leading-relaxed text-white/80">
                {project.brief}
              </p>
            </ScrollReveal>
          )}
          {project.process && (
            <ScrollReveal delay={0.1}>
              <p className="mb-3 text-[11px] font-mono tracking-widest text-orange">
                {"// El proceso"}
              </p>
              <p className="text-[14px] leading-relaxed text-white/80">
                {project.process}
              </p>
            </ScrollReveal>
          )}
          {project.result && (
            <ScrollReveal delay={0.2}>
              <p className="mb-3 text-[11px] font-mono tracking-widest text-orange">
                {"// El resultado"}
              </p>
              <p className="text-[14px] leading-relaxed text-white/80">
                {project.result}
              </p>
            </ScrollReveal>
          )}
        </div>
      </section>

      {/* Video final */}
      {videoEmbed && (
        <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-5xl">
            <ScrollReveal>
              <p className="mb-4 text-[12px] font-mono tracking-widest text-orange">
                {"// Pieza final"}
              </p>
              <div className="overflow-hidden rounded-2xl">
                {videoEmbed.kind === "iframe" ? (
                  <iframe
                    src={videoEmbed.url}
                    className="aspect-video w-full bg-black"
                    allow="autoplay; fullscreen; picture-in-picture"
                    allowFullScreen
                    title={project.title}
                  />
                ) : (
                  <video
                    src={videoEmbed.url}
                    controls
                    className="aspect-video w-full bg-black"
                  />
                )}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Galería */}
      {gallery.length > 0 && (
        <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="mb-6 text-[12px] font-mono tracking-widest text-orange">
                {"// Galería"}
              </p>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {gallery.map((img, i) => (
                <ScrollReveal key={i} delay={(i % 3) * 0.06}>
                  <figure className="overflow-hidden rounded-2xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.url}
                      alt={img.alt ?? ""}
                      className="aspect-[4/3] w-full object-cover transition-transform duration-700 hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    {img.caption && (
                      <figcaption className="px-3 py-2 text-[12px] text-white/55">
                        {img.caption}
                      </figcaption>
                    )}
                  </figure>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Antes / Después */}
      {beforeAfter.length > 0 && (
        <section className="px-6 py-16" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-4xl">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Antes / después"}
              </p>
              <h2
                className="mb-8 font-heading text-white"
                style={{ fontSize: 32, lineHeight: 1.05 }}
              >
                El cambio
              </h2>
            </ScrollReveal>
            <div className="flex flex-col gap-6">
              {beforeAfter.map((ba, i) => (
                <ScrollReveal key={i} delay={i * 0.1}>
                  <BeforeAfterSlider
                    before={ba.before}
                    after={ba.after}
                    label={ba.label}
                  />
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Créditos */}
      {credits.length > 0 && (
        <section className="px-6 py-16" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-3xl">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Créditos"}
              </p>
              <div className="grid grid-cols-1 gap-x-12 gap-y-3 md:grid-cols-2">
                {credits.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-baseline justify-between border-b border-dashed py-2"
                    style={{ borderColor: "rgba(255,255,255,0.1)" }}
                  >
                    <span className="text-[12px] uppercase tracking-wider text-white/45">
                      {c.role}
                    </span>
                    <span className="text-[14px] font-medium text-white">
                      {c.name}
                    </span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Otros proyectos */}
      {others.length > 0 && (
        <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <h2
                className="mb-10 font-heading text-white"
                style={{ fontSize: 32, lineHeight: 1.05 }}
              >
                Otros <span className="italic">{CATEGORY_LABELS[project.category]}</span>
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {others.map((o, i) => (
                <ScrollReveal key={o.id} delay={(i % 3) * 0.07}>
                  <Link
                    href={`/portafolio/${o.slug}`}
                    className="group block overflow-hidden rounded-2xl"
                  >
                    {o.coverImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={o.coverImageUrl}
                        alt={o.title}
                        className="aspect-[4/3] w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="mt-3">
                      <div className="text-[11px] uppercase tracking-widest text-orange">
                        {o.year}
                      </div>
                      <div className="text-[15px] font-semibold text-white">
                        {o.title}
                      </div>
                    </div>
                  </Link>
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-10 text-center">
              <Link
                href="/portafolio"
                className="inline-flex items-center gap-2 text-[14px] text-orange hover:underline"
              >
                Ver todo el portafolio <ChevronRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(36px,5vw,64px)",
                lineHeight: 1.05,
              }}
            >
              ¿Te gusta lo que ves?
            </h2>
            <p className="mt-4 text-[15px] text-white/70">
              Cuéntanos tu próximo proyecto.
            </p>
            <Link href="/contacto" className="btn-primary mt-7 inline-flex">
              Hablemos <ArrowUpRight />
            </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}

function buildVideoEmbed(url: string): { kind: "iframe" | "video"; url: string } | null {
  const detected = detectEmbedKind(url);
  if (detected.kind === EmbedKind.YOUTUBE) {
    const id = extractYouTubeId(url);
    if (id) return { kind: "iframe", url: youtubeEmbedUrl(id) };
  }
  if (detected.kind === EmbedKind.VIMEO) {
    const id = extractVimeoId(url);
    if (id) return { kind: "iframe", url: vimeoEmbedUrl(id) };
  }
  if (detected.kind === EmbedKind.DRIVE_FILE) {
    const id = extractDriveFileId(url);
    if (id) return { kind: "iframe", url: driveFilePreviewIframeUrl(id) };
  }
  if (detected.kind === EmbedKind.DIRECT_VIDEO) {
    return { kind: "video", url };
  }
  return null;
}
