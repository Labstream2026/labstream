import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/public/Navbar";
import { Footer } from "@/components/public/Footer";
import { Contact } from "@/components/public/Contact";
import { ArrowUpRight, ChevronRight } from "@/components/Icons";

export default async function ServicioPage(props: {
  searchParams: Promise<{ id?: string }>;
}) {
  const sp = await props.searchParams;
  const slug = sp.id;

  const services = await prisma.service.findMany({
    where: { visible: true },
    orderBy: { order: "asc" },
  });

  if (services.length === 0) notFound();

  const active =
    services.find((s) => s.slug === slug) ?? services[0];

  const tags = (active.content ?? "").split(",").filter(Boolean);

  return (
    <main>
      <Navbar />

      <section
        className="relative px-6 pt-32 pb-16"
        style={{ background: "var(--bg)" }}
      >
        <div
          className="absolute inset-x-0 top-0 h-[60vh]"
          style={{
            background:
              "radial-gradient(ellipse at top, rgba(232,100,12,0.18), transparent 55%)",
          }}
        />
        <div className="relative mx-auto flex max-w-6xl flex-col items-start gap-3">
          <div className="text-[12px] font-mono tracking-widest text-orange">
            // Servicios
          </div>
          <h1
            className="font-heading text-white"
            style={{
              fontSize: "clamp(48px,7vw,88px)",
              lineHeight: 0.95,
              letterSpacing: "-1.5px",
            }}
          >
            {active.title}
          </h1>
          {active.summary && (
            <p
              className="max-w-2xl text-white/75"
              style={{ fontSize: 17, lineHeight: 1.55 }}
            >
              {active.summary}
            </p>
          )}
          {tags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {tags.map((t) => (
                <span
                  key={t}
                  className="lg rounded-full px-3 py-1 text-[11px] font-medium tracking-wide text-white/85"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="px-6 pb-32">
        <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-[260px_1fr]">
          <aside className="lg sticky top-24 self-start rounded-2xl p-5">
            <div className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">
              Otros servicios
            </div>
            <nav className="flex flex-col gap-0.5 text-[13px]">
              {services.map((s) => {
                const isActive = s.id === active.id;
                return (
                  <Link
                    key={s.id}
                    href={`/servicio?id=${s.slug}`}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 transition-colors ${
                      isActive
                        ? "bg-white/10 text-white"
                        : "text-white/65 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <span>{s.title}</span>
                    {isActive && <ChevronRight className="h-3.5 w-3.5" />}
                  </Link>
                );
              })}
            </nav>
          </aside>

          <article className="flex flex-col gap-10">
            <div className="lg rounded-3xl p-8">
              <h2
                className="mb-4 font-heading italic text-white"
                style={{ fontSize: 36, lineHeight: 1.1 }}
              >
                Cómo trabajamos
              </h2>
              <p className="text-[15px] font-light leading-relaxed text-white/75">
                Cada {active.title.toLowerCase()} comienza con una conversación.
                Diagnosticamos el objetivo, definimos los entregables y
                proponemos un equipo y un cronograma alineados a tu marca. La
                producción y la post se ejecutan con disciplina cinematográfica
                y reportes claros en cada etapa.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {[
                {
                  label: "Tiempo típico",
                  value: "2 – 6 semanas",
                  desc: "Según alcance y rodaje.",
                },
                {
                  label: "Equipo dedicado",
                  value: "Director + Crew",
                  desc: "Producción y post integrada.",
                },
                {
                  label: "Entregables",
                  value: "Multiplataforma",
                  desc: "Master + cortes para cada canal.",
                },
              ].map((c) => (
                <div key={c.label} className="lg rounded-2xl p-5">
                  <div className="text-[11px] font-semibold uppercase tracking-widest text-white/45">
                    {c.label}
                  </div>
                  <div
                    className="mt-2 font-heading italic text-white"
                    style={{ fontSize: 26, lineHeight: 1.05 }}
                  >
                    {c.value}
                  </div>
                  <p className="mt-1 text-[12px] font-light text-white/60">
                    {c.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="lg flex flex-wrap items-center justify-between gap-4 rounded-3xl p-8">
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-widest text-orange">
                  Listos para empezar
                </div>
                <h3
                  className="mt-2 font-heading italic text-white"
                  style={{ fontSize: 28, lineHeight: 1.1 }}
                >
                  Cuéntanos tu proyecto
                </h3>
                <p className="mt-1 text-[13px] text-white/65">
                  Respondemos en menos de 24 horas.
                </p>
              </div>
              <Link href="/#contact" className="btn-primary">
                Hablemos <ArrowUpRight />
              </Link>
            </div>
          </article>
        </div>
      </section>

      <Contact />
      <Footer />
    </main>
  );
}
