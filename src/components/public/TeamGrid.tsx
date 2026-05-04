import type { TeamMember } from "@prisma/client";
import { ScrollReveal } from "@/components/public/ScrollReveal";

export function TeamGrid({
  members,
  eyebrow = "Equipo",
  heading = "Las personas detrás",
}: {
  members: TeamMember[];
  eyebrow?: string;
  heading?: string;
}) {
  if (members.length === 0) return null;
  return (
    <section className="px-6 py-24" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-[12px] font-mono tracking-widest text-orange">
            // {eyebrow}
          </p>
          <h2
            className="font-heading text-white"
            style={{
              fontSize: "clamp(32px,4.5vw,56px)",
              lineHeight: 1.05,
              letterSpacing: "-1px",
            }}
          >
            {heading}
          </h2>
        </div>

        <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {members.map((m, i) => (
            <ScrollReveal key={m.id} delay={(i % 4) * 0.08}>
              <div className="group relative overflow-hidden rounded-2xl">
                {m.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.photoUrl}
                    alt={m.name}
                    className="aspect-[3/4] w-full object-cover grayscale transition-all duration-700 group-hover:grayscale-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="aspect-[3/4] w-full bg-white/5" />
                )}
                <div
                  className="absolute inset-x-0 bottom-0 p-4"
                  style={{
                    background:
                      "linear-gradient(180deg, transparent, rgba(0,0,0,0.85))",
                  }}
                >
                  <div className="text-[15px] font-semibold text-white">
                    {m.name}
                  </div>
                  <div className="text-[12px] text-orange">{m.role}</div>
                  {m.bio && (
                    <p className="mt-2 max-h-0 overflow-hidden text-[12px] leading-relaxed text-white/75 opacity-0 transition-all duration-500 group-hover:max-h-32 group-hover:opacity-100">
                      {m.bio}
                    </p>
                  )}
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
