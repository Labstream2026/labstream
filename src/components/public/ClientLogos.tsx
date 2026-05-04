import type { ClientLogo } from "@prisma/client";
import { ScrollReveal } from "@/components/public/ScrollReveal";

export function ClientLogos({
  logos,
  label = "Marcas que confían en nosotros",
}: {
  logos: ClientLogo[];
  label?: string;
}) {
  if (logos.length === 0) return null;

  return (
    <section className="px-6 py-16 md:py-20" style={{ background: "var(--bg)" }}>
      <div className="mx-auto max-w-6xl">
        <ScrollReveal>
          <p className="mb-8 text-center text-[12px] font-semibold uppercase tracking-[0.2em] text-white/45">
            {label}
          </p>
        </ScrollReveal>
        <ScrollReveal delay={0.1}>
          <div className="grid grid-cols-2 gap-x-8 gap-y-6 sm:grid-cols-3 md:grid-cols-5">
            {logos.map((l) => (
              <a
                key={l.id}
                href={l.websiteUrl ?? "#"}
                target={l.websiteUrl ? "_blank" : undefined}
                rel="noreferrer"
                className="flex h-16 items-center justify-center grayscale opacity-60 transition-all hover:opacity-100 hover:grayscale-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={l.logoUrl}
                  alt={l.name}
                  className="max-h-full max-w-full object-contain"
                />
              </a>
            ))}
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
