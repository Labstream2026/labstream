import Link from "next/link";
import { Logo } from "@/components/Logo";
import { getSiteSettings } from "@/lib/site-settings";

const SERVICES = [
  "Producción Audiovisual",
  "Fotografía",
  "Contenido para Redes",
  "IA Aplicada",
  "Livestreaming",
  "Post-producción",
];

export async function Footer() {
  const site = await getSiteSettings();

  const socials: { label: string; url: string }[] = [
    site.socials.instagram && {
      label: "Instagram",
      url: site.socials.instagram,
    },
    site.socials.vimeo && { label: "Vimeo", url: site.socials.vimeo },
    site.socials.youtube && { label: "YouTube", url: site.socials.youtube },
    site.socials.linkedin && { label: "LinkedIn", url: site.socials.linkedin },
  ].filter(Boolean) as { label: string; url: string }[];

  return (
    <footer
      className="border-t px-6 py-14"
      style={{
        borderColor: "var(--border)",
        background: "var(--bg)",
      }}
    >
      <div className="mx-auto grid max-w-6xl gap-10 md:grid-cols-3">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-[13px] font-light text-white/55">
            {site.tagline ??
              "Estudio Audiovisual + IA. Narrativa que viaja más allá del ojo."}
          </p>
          {socials.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {socials.map((s) => (
                <a
                  key={s.label}
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-medium text-white/65 transition-colors hover:border-orange/40 hover:text-white"
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
              <li key={s}>
                <Link href="/#services" className="transition-colors hover:text-white">
                  {s}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-white/40">
            Contacto
          </div>
          <ul className="space-y-2 text-[13px] text-white/70">
            {site.contactEmail && (
              <li>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="transition-colors hover:text-white"
                >
                  {site.contactEmail}
                </a>
              </li>
            )}
            <li>
              <Link href="/cms" className="transition-colors hover:text-white">
                Acceso CMS / Portal
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div
        className="mx-auto mt-12 flex max-w-6xl items-center justify-between border-t pt-6 text-[12px] text-white/40"
        style={{ borderColor: "var(--border)" }}
      >
        <span>
          © {new Date().getFullYear()} {site.siteName}. Todos los derechos reservados.
        </span>
        <span className="font-mono">v1.0</span>
      </div>
    </footer>
  );
}
