import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/public/Navbar";
import { ScrollProgress } from "@/components/public/ScrollProgress";
import { WhatsAppFloat } from "@/components/public/WhatsAppFloat";
import { Footer } from "@/components/public/Footer";
import { ContactForm } from "@/components/public/ContactForm";
import { FaqAccordion } from "@/components/public/FaqAccordion";
import { ScrollReveal } from "@/components/public/ScrollReveal";
import { getSiteSettings } from "@/lib/site-settings";

export const metadata = {
  title: "Contacto",
  description: "Cuéntanos tu próximo proyecto. Respondemos en menos de 24 horas.",
};

const CALCOM_URL =
  process.env.NEXT_PUBLIC_CALCOM_URL ?? "https://cal.com/labstream/30min";
const WA_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "573000000000";

export default async function ContactoPage() {
  const [site, faqs] = await Promise.all([
    getSiteSettings(),
    prisma.faqItem.findMany({
      where: { visible: true },
      orderBy: { order: "asc" },
      take: 5,
    }),
  ]);

  return (
    <main>
      <ScrollProgress />
      <Navbar />
      <WhatsAppFloat />

      <section className="relative overflow-hidden pb-12 pt-32 md:pt-40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/media/hero-cinema.jpg"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,8,8,0.45) 0%, rgba(8,8,8,0.78) 55%, rgba(8,8,8,1) 100%), radial-gradient(ellipse at top, rgba(232,100,12,0.12), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-5xl px-6">
          <ScrollReveal>
            <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
              {"// Hablemos"}
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
              Cuéntanos tu proyecto
            </h1>
            <p className="mt-7 max-w-2xl text-[16px] font-light leading-relaxed text-white/75 md:text-[18px]">
              Respondemos en menos de 24 horas. La primera conversación es siempre
              gratis y te dejamos un brief con criterio independiente — útil aunque
              no trabajes con nosotros.
            </p>
          </ScrollReveal>
        </div>
      </section>

      <section className="px-6 py-12" style={{ background: "var(--bg)" }}>
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[3fr_2fr]">
          {/* Form */}
          <div>
            <ScrollReveal>
              <h2
                className="mb-6 font-heading text-white"
                style={{ fontSize: 24, lineHeight: 1.05 }}
              >
                Escríbenos
              </h2>
              <ContactForm />
            </ScrollReveal>
          </div>

          {/* Otros canales */}
          <div className="flex flex-col gap-5">
            <ScrollReveal>
              <h2
                className="mb-6 font-heading text-white"
                style={{ fontSize: 24, lineHeight: 1.05 }}
              >
                O elige otro canal
              </h2>
            </ScrollReveal>

            <ScrollReveal delay={0.1}>
              <a
                href={CALCOM_URL}
                target="_blank"
                rel="noreferrer"
                className="lg group block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              >
                <div className="mb-2 text-2xl">📅</div>
                <h3 className="mb-1 text-[16px] font-semibold text-white">
                  Reserva 30 minutos
                </h3>
                <p className="text-[13px] text-white/65">
                  Sin form, directo a calendario. Llamada gratis para entender tu
                  proyecto.
                </p>
                <div className="mt-3 text-[12px] font-medium text-orange">
                  Reservar →
                </div>
              </a>
            </ScrollReveal>

            <ScrollReveal delay={0.15}>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Hola, vengo de la web de Labstream Studio.")}`}
                target="_blank"
                rel="noreferrer"
                className="lg group block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
              >
                <div className="mb-2 text-2xl">💬</div>
                <h3 className="mb-1 text-[16px] font-semibold text-white">
                  WhatsApp
                </h3>
                <p className="text-[13px] text-white/65">
                  Respondemos rápido en horario laboral (Bogotá, GMT-5).
                </p>
                <div className="mt-3 text-[12px] font-medium text-orange">
                  Abrir WhatsApp →
                </div>
              </a>
            </ScrollReveal>

            {site.contactEmail && (
              <ScrollReveal delay={0.2}>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="lg group block rounded-2xl p-5 transition-all hover:-translate-y-0.5 hover:bg-white/[0.07]"
                >
                  <div className="mb-2 text-2xl">📧</div>
                  <h3 className="mb-1 text-[16px] font-semibold text-white">
                    Email directo
                  </h3>
                  <p className="text-[13px] text-orange">{site.contactEmail}</p>
                </a>
              </ScrollReveal>
            )}
          </div>
        </div>
      </section>

      {/* Mini FAQ */}
      <FaqAccordion items={faqs} heading="Antes de escribir, ¿esto te ayuda?" />

      <Footer />
    </main>
  );
}
