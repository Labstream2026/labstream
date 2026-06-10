import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { isPreviewMode, mergeDraft } from "@/lib/preview";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight, ChevronRight } from "@/components/Icons";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await props.params;
  const s = await prisma.service.findUnique({ where: { slug } });
  if (!s) return { title: "Servicio no encontrado" };
  return {
    title: s.title,
    description: s.summary ?? undefined,
    openGraph: { images: s.heroImageUrl ? [s.heroImageUrl] : [] },
  };
}

export default async function ServicioDetailPage(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ preview?: string }>;
}) {
  const { slug } = await props.params;
  const sp = await props.searchParams;
  const preview = await isPreviewMode(sp);
  const found = await prisma.service.findUnique({ where: { slug } });
  if (!found) notFound();
  const service = preview ? mergeDraft(found, found.draft) : found;

  const others = await prisma.service.findMany({
    where: { id: { not: service.id }, visible: true },
    orderBy: { order: "asc" },
  });

  const capabilities =
    (service.capabilities as Array<{ icon: string; title: string; desc: string }> | null) ?? [];
  const process =
    (service.process as Array<{ step: string; title: string; desc: string }> | null) ?? [];

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative min-h-[60vh] pt-32 pb-16 md:pt-40 md:pb-20">
          {service.heroImageUrl && (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={service.heroImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
                referrerPolicy="no-referrer"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.95) 100%)",
                }}
              />
            </>
          )}
          {!service.heroImageUrl && (
            <div
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at top, rgba(232,100,12,0.18), transparent 60%)",
              }}
            />
          )}
          <div className="relative px-6">
            <div className="mx-auto max-w-5xl">
              <Link
                href="/servicios"
                className="mb-4 inline-flex items-center gap-1.5 text-[12px] text-white/70 hover:text-orange"
              >
                ← Todos los servicios
              </Link>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Servicio"}
              </p>
              <h1
                className="font-heading italic text-white"
                style={{
                  fontSize: "clamp(48px,8vw,120px)",
                  lineHeight: 0.92,
                  letterSpacing: "-2px",
                  maxWidth: "14ch",
                }}
              >
                {service.title}
              </h1>
              {service.longDescription && (
                <p className="mt-7 max-w-2xl text-[16px] font-light leading-relaxed text-white/80 md:text-[18px]">
                  {service.longDescription}
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Capacidades */}
      {capabilities.length > 0 && (
        <section className="px-6 py-20" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Qué incluye"}
              </p>
              <h2
                className="mb-10 font-heading text-white"
                style={{ fontSize: 36, lineHeight: 1.05 }}
              >
                Capacidades
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {capabilities.map((c, i) => (
                <ScrollReveal key={i} delay={(i % 2) * 0.06}>
                  <div className="lg flex h-full flex-col rounded-2xl p-6">
                    <div className="mb-3 text-3xl">{c.icon}</div>
                    <h3 className="mb-2 text-[18px] font-semibold text-white">
                      {c.title}
                    </h3>
                    <p className="text-[14px] font-light leading-relaxed text-white/70">
                      {c.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Proceso */}
      {process.length > 0 && (
        <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Cómo trabajamos"}
              </p>
              <h2
                className="mb-10 font-heading text-white"
                style={{ fontSize: 36, lineHeight: 1.05 }}
              >
                Proceso
              </h2>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {process.map((p, i) => (
                <ScrollReveal key={i} delay={(i % 3) * 0.06}>
                  <div className="lg flex h-full flex-col rounded-2xl p-5">
                    <div
                      className="mb-2 font-heading italic"
                      style={{ fontSize: 32, color: "var(--orange)", lineHeight: 1 }}
                    >
                      {p.step}
                    </div>
                    <h3 className="mb-2 text-[15px] font-semibold text-white">
                      {p.title}
                    </h3>
                    <p className="text-[13px] font-light leading-relaxed text-white/65">
                      {p.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing */}
      {service.pricing && (
        <section className="px-6 py-16" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-3xl text-center">
            <ScrollReveal>
              <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                {"// Inversión"}
              </p>
              <p className="font-heading italic text-white" style={{ fontSize: 28, lineHeight: 1.2 }}>
                {service.pricing}
              </p>
              <Link href="/contacto" className="btn-primary mt-7 inline-flex">
                Solicitar cotización <ArrowUpRight />
              </Link>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* Otros servicios */}
      <section className="px-6 py-20" style={{ background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <h2 className="mb-10 font-heading text-white" style={{ fontSize: 32 }}>
              Otros servicios
            </h2>
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <Link
                key={o.id}
                href={`/servicio/${o.slug}`}
                className="lg group flex items-center justify-between gap-3 rounded-xl px-5 py-4 hover:bg-white/[0.07]"
              >
                <span className="text-[15px] font-medium text-white">
                  {o.title}
                </span>
                <ChevronRight className="h-4 w-4 text-white/40 transition-all group-hover:translate-x-1 group-hover:text-orange" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
