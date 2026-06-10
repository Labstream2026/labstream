const STEPS = [
  {
    n: "01",
    title: "Briefing",
    desc: "Escuchamos. Entendemos tu visión y los objetivos a alcanzar.",
  },
  {
    n: "02",
    title: "Concepto",
    desc: "Traducimos ideas en una propuesta creativa y visual concreta.",
  },
  {
    n: "03",
    title: "Producción",
    desc: "Capturamos con precisión técnica y criterio artístico.",
  },
  {
    n: "04",
    title: "Post-Producción",
    desc: "Edición, color, motion graphics y mezcla de audio.",
  },
  {
    n: "05",
    title: "Entrega",
    desc: "Formatos optimizados para cada canal y plataforma.",
  },
];

export function Process() {
  return (
    <section
      id="process"
      className="relative px-6 py-32"
      style={{ background: "var(--bg-2)" }}
    >
      <div className="mx-auto max-w-6xl">
        <div className="mb-14 text-center">
          <div className="mb-4 inline-block text-[12px] font-mono tracking-widest text-orange">
            {"// Proceso"}
          </div>
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

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="lg flex flex-col rounded-2xl p-6"
            >
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
                {s.title}
              </h3>
              <p className="text-[13px] font-light leading-relaxed text-white/65">
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
