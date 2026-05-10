import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSiteSettings } from "@/lib/site-settings";
import { NewsletterForm } from "@/components/public/NewsletterForm";

const SERVICES = [
  { label: "Producción Audiovisual", href: "/servicio/produccion-audiovisual" },
  { label: "Fotografía", href: "/servicio/fotografia" },
  { label: "Contenido para Redes", href: "/servicio/contenido-redes" },
  { label: "IA Aplicada", href: "/servicio/ia-contenido" },
  { label: "Livestreaming", href: "/servicio/livestreaming" },
  { label: "Post-producción", href: "/servicio/post-produccion" },
];

const COMPANY = [
  { label: "Nosotros", href: "/nosotros" },
  { label: "Portafolio", href: "/portafolio" },
  { label: "Blog", href: "/blog" },
  { label: "Contacto", href: "/contacto" },
];

export async function Footer() {
  const site = await getSiteSettings();

  const socials: { label: string; url: string }[] = [
    site.socials.instagram && { label: "Instagram", url: site.socials.instagram },
    site.socials.vimeo && { label: "Vimeo", url: site.socials.vimeo },
    site.socials.youtube && { label: "YouTube", url: site.socials.youtube },
    site.socials.linkedin && { label: "LinkedIn", url: site.socials.linkedin },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <footer
      className="border-t px-6 pb-10 pt-16"
      style={{ borderColor: "var(--border)", background: "var(--bg)" }}
    >
      <div className="mx-auto max-w-6xl">
        {/* Newsletter banner */}
        <div
          className="mb-12 rounded-3xl p-8 md:p-10"
          style={{
            background:
              "linear-gradient(135deg, rgba(232,100,12,0.12), rgba(123,97,255,0.08))",
            border: "1px solid rgba(232,100,12,0.25)",
          }}
        >
          <div className="grid items-center gap-6 md:grid-cols-[1fr_auto]">
            <div>
              <p className="mb-2 text-[12px] font-mono tracking-widest text-orange">
                // Newsletter
              </p>
              <h3
                className="mb-2 font-heading italic text-white"
                style={{ fontSize: "clamp(24px,3vw,36px)", lineHeight: 1.1 }}
              >
                Casos de estudio + behind the scenes
              </h3>
              <p className="text-[13px] text-white/70">
                Una vez al mes. Sin spam, solo lo bueno.
              </p>
            </div>
            <div className="md:w-[380px]">
              <NewsletterForm source="footer" />
            </div>
          </div>
        </div>

        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <Logo />
            <p className="mt-4 max-w-sm text-[13px] font-light text-white/55">
              {site.tagline ??
                "Producción audiovisual de vanguardia, fusionada con inteligencia artificial."}
            </p>
            {socials.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.url}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-full border border-white/10 px-3 py-1 text-[11px] font-medium text-white/65 transition-colors hover:border-orange/40 hover:text-white"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Servicios
            </div>
            <ul className="space-y-2 text-[13px] text-white/70">
              {SERVICES.map((s) => (
                <li key={s.href}>
                  <Link href={s.href} className="transition-colors hover:text-white">
                    {s.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Compañía
            </div>
            <ul className="space-y-2 text-[13px] text-white/70">
              {COMPANY.map((c) => (
                <li key={c.href}>
                  <Link href={c.href} className="transition-colors hover:text-white">
                    {c.label}
                  </Link>
                </li>
              ))}
              {site.contactEmail && (
                <li className="pt-3">
                  <a
                    href={`mailto:${site.contactEmail}`}
                    className="text-orange hover:underline"
                  >
                    {site.contactEmail}
                  </a>
                </li>
              )}
              <li className="pt-3">
                <Link
                  href="/cms/login"
                  className="inline-flex items-center gap-1.5 rounded-full border border-orange/40 bg-orange/[0.08] px-3 py-1 text-[12px] font-semibold text-orange transition-colors hover:bg-orange/15"
                >
                  <svg width="12" height="12" viewBox="0 0 16 16" fill="none" aria-hidden>
                    <path
                      d="M8 8a3 3 0 100-6 3 3 0 000 6zM2 14a6 6 0 1112 0H2z"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Acceso clientes
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div
          className="mt-12 flex flex-col items-start justify-between gap-3 border-t pt-6 text-[12px] text-white/40 sm:flex-row sm:items-center"
          style={{ borderColor: "var(--border)" }}
        >
          <span>
            © {new Date().getFullYear()} {site.siteName}. Todos los derechos reservados.
          </span>
          <span className="font-mono">v2.0 · Hecho con ☕</span>
        </div>
      </div>
    </footer>
  );
}
