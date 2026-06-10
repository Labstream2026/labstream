import Link from "next/link";
import { ArrowUpRight } from "@/components/Icons";

type Service = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  content: string | null;
};

export function Services({ services }: { services: Service[] }) {
  return (
    <section id="services" className="relative px-6 py-32" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-block text-[12px] font-mono tracking-widest text-orange">
            {"// Servicios"}
          </div>
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

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => {
            const tags = (s.content ?? "").split(",").filter(Boolean);
            return (
              <Link
                key={s.id}
                href={`/servicio?id=${s.slug}`}
                className="lg group flex flex-col overflow-hidden rounded-3xl p-6 transition-all hover:-translate-y-1 hover:bg-white/[0.07]"
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
                  <ArrowUpRight className="h-5 w-5 text-white/40 transition-colors group-hover:text-orange" />
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
            );
          })}
        </div>
      </div>
    </section>
  );
}
