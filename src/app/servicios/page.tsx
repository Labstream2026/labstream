import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { ArrowUpRight } from "@/components/Icons";

export const metadata = {
  title: "Servicios",
  description: "Producción audiovisual integral: video, fotografía, contenido para redes, IA, livestreaming y post-producción.",
};

export default async function ServiciosPage() {
  const services = await prisma.service.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
  });

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/location.jpg"
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
        <div className="relative mx-auto max-w-5xl px-6">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// Servicios"}
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
              Producción end to end
            </h1>
            <p className="mt-7 max-w-2xl text-[16px] font-light leading-relaxed text-white/75 md:text-[18px]">
              Desde la chispa creativa hasta el master final. Equipos, talento y
              procesos para historias de alto impacto.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="px-6 py-16" style={{ background: "var(--bg)" }}>
        <div className="mx-auto max-w-6xl space-y-5">
          {services.map((s, i) => {
            const tags = (s.content ?? "").split(",").filter(Boolean);
            return (
              <ScrollReveal key={s.id} delay={(i % 2) * 0.05}>
                <Link
                  href={`/servicio/${s.slug}`}
                  className="group block overflow-hidden rounded-3xl border border-white/5"
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_3fr]">
                    <div
                      className="relative aspect-[4/3] overflow-hidden md:aspect-auto"
                      style={{ background: "var(--bg-2)" }}
                    >
                      {s.heroImageUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.heroImageUrl}
                          alt={s.title}
                          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                          referrerPolicy="no-referrer"
                        />
                      )}
                    </div>
                    <div className="flex flex-col justify-center gap-4 p-8 md:p-12">
                      <div>
                        <p className="mb-2 text-[11px] font-mono tracking-widest text-orange">
                          {"// 0"}{i + 1}
                        </p>
                        <h2
                          className="font-heading text-white"
                          style={{
                            fontSize: "clamp(28px,3.5vw,44px)",
                            lineHeight: 1.05,
                            letterSpacing: "-1px",
                          }}
                        >
                          {s.title}
                        </h2>
                      </div>
                      <p className="text-[15px] font-light leading-relaxed text-white/75">
                        {s.summary}
                      </p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map((t) => (
                            <span
                              key={t}
                              className="rounded-full border border-white/10 px-2.5 py-1 text-[10px] font-medium tracking-wide text-white/60"
                            >
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                      <div className="mt-2 flex items-center gap-1.5 text-[13px] font-medium text-orange transition-transform group-hover:translate-x-1">
                        Conocer más <ArrowUpRight className="h-3.5 w-3.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              </ScrollReveal>
            );
          })}
        </div>
      </section>

      <Footer />
    </main>
  );
}
