import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { isPreviewMode, mergeDraft } from "@/lib/preview";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { TeamGrid } from "@/components/public/TeamGrid";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight } from "@/components/Icons";

export const metadata = {
  title: "Nosotros",
  description: "12 años produciendo audiovisual en LATAM. Conoce al equipo y la historia detrás de Labstream Studio.",
};

export default async function NosotrosPage(props: {
  searchParams?: Promise<{ preview?: string }>;
}) {
  const sp = props.searchParams ? await props.searchParams : {};
  const preview = await isPreviewMode(sp);
  const [aboutFound, team] = await Promise.all([
    prisma.aboutContent.findUnique({ where: { id: "singleton" } }),
    prisma.teamMember.findMany({
      where: { visible: true },
      orderBy: [{ featured: "desc" }, { order: "asc" }],
    }),
  ]);

  const about =
    preview && aboutFound ? mergeDraft(aboutFound, aboutFound.draft) : aboutFound;
  const values = (about?.values as Array<{ icon: string; title: string; desc: string }>) ?? [];

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      {/* Hero editorial */}
      <section className="relative overflow-hidden px-6 pb-20 pt-32 md:pt-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/set-produccion.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,8,0.55) 0%, rgba(8,8,8,0.85) 60%, rgba(8,8,8,1) 100%), radial-gradient(ellipse at top, rgba(232,100,12,0.18), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// "}{about?.heroEyebrow ?? "Nosotros"}
            </p>
            <h1
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(48px,8vw,120px)",
                lineHeight: 0.92,
                letterSpacing: "-2px",
                maxWidth: "16ch",
              }}
            >
              {about?.heroTitle ??
                "Una casa productora obsesionada con el detalle"}
            </h1>
            {about?.heroSubtitle && (
              <p className="mt-8 max-w-2xl text-[17px] font-light leading-relaxed text-white/75">
                {about.heroSubtitle}
              </p>
            )}
          </ScrollReveal>
        </div>
      </section>

      {/* Historia */}
      {about?.story && (
        <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-3xl">
            <ScrollReveal>
              <p className="mb-4 text-[12px] font-mono tracking-widest text-orange">
                {"// Historia"}
              </p>
              <h2
                className="mb-10 font-heading text-white"
                style={{
                  fontSize: "clamp(36px,4.5vw,56px)",
                  lineHeight: 1.05,
                  letterSpacing: "-1px",
                }}
              >
                Cómo llegamos hasta aquí
              </h2>
            </ScrollReveal>
            <div className="flex flex-col gap-5 text-[16px] font-light leading-relaxed text-white/80">
              {about.story.split("\n\n").map((p, i) => (
                <ScrollReveal key={i} delay={i * 0.05}>
                  <p>{p}</p>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Misión / Visión */}
      {(about?.mission || about?.vision) && (
        <section
          className="px-6 py-20"
          style={{ background: "var(--bg-2)" }}
        >
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-2">
            {about?.mission && (
              <ScrollReveal>
                <div className="lg h-full rounded-3xl p-8">
                  <p className="mb-3 text-[11px] font-mono tracking-widest text-orange">
                    {"// Misión"}
                  </p>
                  <p className="font-heading italic text-white" style={{ fontSize: 26, lineHeight: 1.2 }}>
                    {about.mission}
                  </p>
                </div>
              </ScrollReveal>
            )}
            {about?.vision && (
              <ScrollReveal delay={0.1}>
                <div className="lg h-full rounded-3xl p-8">
                  <p className="mb-3 text-[11px] font-mono tracking-widest text-orange">
                    {"// Visión"}
                  </p>
                  <p className="font-heading italic text-white" style={{ fontSize: 26, lineHeight: 1.2 }}>
                    {about.vision}
                  </p>
                </div>
              </ScrollReveal>
            )}
          </div>
        </section>
      )}

      {/* Valores */}
      {values.length > 0 && (
        <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
          <div className="mx-auto max-w-6xl">
            <ScrollReveal>
              <div className="mb-12 text-center">
                <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
                  {"// Valores"}
                </p>
                <h2
                  className="font-heading text-white"
                  style={{
                    fontSize: "clamp(36px,4.5vw,56px)",
                    lineHeight: 1.05,
                    letterSpacing: "-1px",
                  }}
                >
                  Cómo <span className="italic">trabajamos</span>
                </h2>
              </div>
            </ScrollReveal>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
              {values.map((v, i) => (
                <ScrollReveal key={i} delay={(i % 4) * 0.07}>
                  <div className="lg flex h-full flex-col rounded-2xl p-6">
                    <div className="mb-3 text-3xl">{v.icon}</div>
                    <h3 className="mb-2 text-[17px] font-semibold text-white">
                      {v.title}
                    </h3>
                    <p className="text-[14px] font-light leading-relaxed text-white/65">
                      {v.desc}
                    </p>
                  </div>
                </ScrollReveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Equipo */}
      <TeamGrid members={team} />

      {/* CTA */}
      <section className="px-6 py-24" style={{ background: "var(--bg-2)" }}>
        <div className="mx-auto max-w-3xl text-center">
          <ScrollReveal>
            <h2
              className="font-heading italic text-white"
              style={{
                fontSize: "clamp(36px,5vw,64px)",
                lineHeight: 1.05,
                letterSpacing: "-1px",
              }}
            >
              ¿Quieres trabajar con nosotros?
            </h2>
            <p className="mx-auto mt-5 max-w-md text-[15px] font-light text-white/70">
              Cuéntanos tu proyecto. La primera conversación es siempre gratis.
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
